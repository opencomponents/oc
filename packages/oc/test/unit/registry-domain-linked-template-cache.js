const expect = require('chai').expect;

const withLinkedTemplateCache = require('../../dist/registry/domain/linked-template-cache').default;

describe('registry : domain : linked-template-cache', () => {
  const makeUpstream = (html = 'upstream-html') => {
    const renderCalls = [];
    const upstream = {
      getInfo: () => ({
        type: 'oc-template-handlebars',
        version: '6.0.26',
        externals: []
      }),
      getCompiledTemplate: (templateString, key) => ({ templateString, key }),
      render: (options, callback) => {
        renderCalls.push(options);
        callback(null, html);
      }
    };
    return { upstream, renderCalls };
  };

  const makeLink = (prefix = 'linked') => {
    const linkCalls = [];
    const link = (spec) => {
      linkCalls.push(spec);
      return (model) => `${prefix}:${spec.id}:${model && model.n}`;
    };
    return { link, linkCalls };
  };

  const renderAsync = (template, options) =>
    new Promise((resolve, reject) => {
      template.render(options, (err, html) =>
        err ? reject(err) : resolve(html)
      );
    });

  describe('when rendering twice with the same key', () => {
    it('delegates once upstream, links once, and serves the second render from cache', async () => {
      const { upstream, renderCalls } = makeUpstream();
      const { link, linkCalls } = makeLink();
      const template = withLinkedTemplateCache(upstream, { link });
      const spec = { id: 'a' };

      const first = await renderAsync(template, {
        key: 'key-a',
        template: spec,
        model: { n: 1 }
      });
      const second = await renderAsync(template, {
        key: 'key-a',
        template: spec,
        model: { n: 2 }
      });

      expect(first).to.equal('upstream-html');
      expect(second).to.equal('linked:a:2');
      expect(renderCalls.length).to.equal(1);
      expect(linkCalls.length).to.equal(1);
      expect(linkCalls[0]).to.equal(spec);
    });
  });

  describe('when rendering with different keys', () => {
    it('links once per key and reuses each entry', async () => {
      const { upstream, renderCalls } = makeUpstream();
      const { link, linkCalls } = makeLink();
      const template = withLinkedTemplateCache(upstream, { link });

      await renderAsync(template, {
        key: 'key-a',
        template: { id: 'a' },
        model: { n: 1 }
      });
      await renderAsync(template, {
        key: 'key-b',
        template: { id: 'b' },
        model: { n: 1 }
      });
      const repeat = await renderAsync(template, {
        key: 'key-a',
        template: { id: 'a' },
        model: { n: 2 }
      });

      expect(repeat).to.equal('linked:a:2');
      expect(renderCalls.length).to.equal(2);
      expect(linkCalls.length).to.equal(2);
    });
  });

  describe('when the upstream render fails', () => {
    it('propagates the error and caches nothing', async () => {
      const { upstream, renderCalls } = makeUpstream();
      upstream.render = (options, callback) => {
        renderCalls.push(options);
        callback(new Error('nope'));
      };
      const { link, linkCalls } = makeLink();
      const template = withLinkedTemplateCache(upstream, { link });
      const options = { key: 'key-err', template: { id: 'e' }, model: {} };

      await renderAsync(template, options).then(
        () => {
          throw new Error('should have rejected');
        },
        (err) => expect(err.message).to.equal('nope')
      );
      await renderAsync(template, options).then(
        () => {
          throw new Error('should have rejected');
        },
        (err) => expect(err.message).to.equal('nope')
      );

      expect(renderCalls.length).to.equal(2);
      expect(linkCalls.length).to.equal(0);
    });
  });

  describe('when the link step throws', () => {
    it('fails open by delegating every render upstream', async () => {
      const { upstream, renderCalls } = makeUpstream('still-renders');
      const template = withLinkedTemplateCache(upstream, {
        link: () => {
          throw new Error('cannot link');
        }
      });
      const options = { key: 'key-x', template: { id: 'x' }, model: {} };

      expect(await renderAsync(template, options)).to.equal('still-renders');
      expect(await renderAsync(template, options)).to.equal('still-renders');
      expect(renderCalls.length).to.equal(2);
    });
  });

  describe('when the linked render itself throws', () => {
    it('reports the error without delegating upstream again', async () => {
      const { upstream, renderCalls } = makeUpstream();
      const template = withLinkedTemplateCache(upstream, {
        link: () => () => {
          throw new Error('bad model');
        }
      });
      const options = { key: 'key-boom', template: { id: 'b' }, model: {} };

      expect(await renderAsync(template, options)).to.equal('upstream-html');
      await renderAsync(template, options).then(
        () => {
          throw new Error('should have rejected');
        },
        (err) => expect(err.message).to.equal('bad model')
      );
      expect(renderCalls.length).to.equal(1);
    });
  });

  describe('when more keys than maxEntries are rendered', () => {
    it('evicts the least-recently used entry', async () => {
      const { upstream, renderCalls } = makeUpstream();
      const { link } = makeLink();
      const template = withLinkedTemplateCache(upstream, { link, maxEntries: 2 });
      const renderKey = (key) =>
        renderAsync(template, { key, template: { id: key }, model: {} });

      await renderKey('a');
      await renderKey('b');
      await renderKey('c');
      await renderKey('a');

      expect(renderCalls.map((call) => call.key)).to.eql(['a', 'b', 'c', 'a']);
    });
  });

  describe('when no key is provided', () => {
    it('caches by spec identity without re-linking the same object', async () => {
      const { upstream, renderCalls } = makeUpstream();
      const { link, linkCalls } = makeLink();
      const template = withLinkedTemplateCache(upstream, { link });
      const spec = { id: 'noid' };

      expect(
        await renderAsync(template, { template: spec, model: { n: 1 } })
      ).to.equal('upstream-html');
      expect(
        await renderAsync(template, { template: spec, model: { n: 2 } })
      ).to.equal('linked:noid:2');
      expect(
        await renderAsync(template, {
          template: { id: 'noid' },
          model: { n: 3 }
        })
      ).to.equal('upstream-html');

      expect(renderCalls.length).to.equal(2);
      expect(linkCalls.length).to.equal(2);
    });
  });

  describe('when the template is not a cacheable spec object', () => {
    it('always delegates without linking', async () => {
      const { upstream, renderCalls } = makeUpstream();
      const { link, linkCalls } = makeLink();
      const template = withLinkedTemplateCache(upstream, { link });

      expect(
        await renderAsync(template, { key: 'k', template: 'raw', model: {} })
      ).to.equal('upstream-html');
      expect(
        await renderAsync(template, { key: 'k', template: 'raw', model: {} })
      ).to.equal('upstream-html');

      expect(renderCalls.length).to.equal(2);
      expect(linkCalls.length).to.equal(0);
    });
  });

  describe('when wrapping', () => {
    it('preserves the module api and returns the same wrapper twice', async () => {
      const { upstream } = makeUpstream();
      const { link } = makeLink();
      const first = withLinkedTemplateCache(upstream, { link });

      expect(first.getInfo()).to.eql(upstream.getInfo());
      expect(first.getCompiledTemplate('text', 'k')).to.eql(
        upstream.getCompiledTemplate('text', 'k')
      );
      expect(withLinkedTemplateCache(upstream, { link })).to.equal(first);
      expect(first).to.not.equal(upstream);
    });
  });

  describe('when using the default handlebars link', () => {
    it('links a real precompiled spec once for repeated renders', async () => {
      const { upstream, renderCalls } = makeUpstream();
      const template = withLinkedTemplateCache(upstream);
      const spec = {
        compiler: [8, '>= 4.3.0'],
        main: () => 'real-linked',
        useData: true
      };
      const options = { key: 'real-key', template: spec, model: {} };

      expect(await renderAsync(template, options)).to.equal('upstream-html');
      expect(await renderAsync(template, options)).to.equal('real-linked');
      expect(renderCalls.length).to.equal(1);
    });
  });
});
