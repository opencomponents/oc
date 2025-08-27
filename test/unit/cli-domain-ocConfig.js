const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

const initialise = () => {
  const fsMock = {
    readFileSync: sinon.stub(),
    writeFileSync: sinon.stub(),
    realpathSync: sinon.stub().returns('/root/'),
    existsSync: sinon.stub().returns(true)
  };

  const settingsMock = {
    configFile: {
      src: './oc.json'
    }
  };

  const pathMock = {
    join: (...args) => args.join('/')
  };

  const ocConfig = injectr(
    '../../dist/cli/domain/ocConfig.js',
    {
      'node:fs': fsMock,
      'node:path': pathMock,
      '../../resources/settings': settingsMock
    },
    { __dirname: '' }
  );

  return { ocConfig, fs: fsMock, settings: settingsMock };
};

describe('cli : domain : ocConfig', () => {
  describe('getOcConfig', () => {
    describe('when config file exists and is valid JSON', () => {
      let data;
      beforeEach(() => {
        data = initialise();
        const mockConfig = {
          registries: ['http://registry1.com', 'http://registry2.com'],
          development: {
            plugins: {
              static: { testPlugin: 'testValue' },
              dynamic: { dynamicPlugin: './plugin.js' }
            },
            fallback: {
              url: 'http://fallback.com',
              client: true
            }
          }
        };
        data.fs.readFileSync.returns(JSON.stringify(mockConfig));
      });

      it('should return parsed config with registries', () => {
        const result = data.ocConfig.getOcConfig();
        expect(result.registries).to.eql(['http://registry1.com', 'http://registry2.com']);
      });

      it('should return parsed config with development plugins', () => {
        const result = data.ocConfig.getOcConfig();
        expect(result.development.plugins.static).to.eql({ testPlugin: 'testValue' });
        expect(result.development.plugins.dynamic).to.eql({ dynamicPlugin: './plugin.js' });
      });

      it('should return parsed config with fallback settings', () => {
        const result = data.ocConfig.getOcConfig();
        expect(result.development.fallback).to.eql({
          url: 'http://fallback.com',
          client: true
        });
      });

      it('should include sourcePath in result', () => {
        const result = data.ocConfig.getOcConfig();
        expect(result.sourcePath).to.equal('./oc.json');
      });

      it('should use default config file path when no path provided', () => {
        data.ocConfig.getOcConfig();
        expect(data.fs.readFileSync.calledWith('./oc.json', 'utf8')).to.be.true;
      });

      it('should use provided path when specified', () => {
        // Reset existsSync to return false by default, then allow the specific path
        data.fs.existsSync.reset();
        data.fs.existsSync.returns(false);
        data.fs.existsSync.withArgs('./custom-config.json/oc.json').returns(true);
        data.ocConfig.getOcConfig('./custom-config.json');
        expect(data.fs.readFileSync.calledWith('./custom-config.json/oc.json', 'utf8')).to.be.true;
      });
    });

    describe('when config has deprecated mocks structure', () => {
      let data;
      beforeEach(() => {
        data = initialise();
        const mockConfig = {
          registries: ['http://registry1.com'],
          mocks: {
            plugins: {
              static: { oldPlugin: 'oldValue' },
              dynamic: { oldDynamic: './old.js' }
            }
          }
        };
        data.fs.readFileSync.returns(JSON.stringify(mockConfig));
      });

      it('should merge deprecated mocks into development plugins', () => {
        const result = data.ocConfig.getOcConfig();
        expect(result.development.plugins.static).to.eql({ oldPlugin: 'oldValue' });
        expect(result.development.plugins.dynamic).to.eql({ oldDynamic: './old.js' });
      });
    });

    describe('when config has both mocks and development plugins', () => {
      let data;
      beforeEach(() => {
        data = initialise();
        const mockConfig = {
          registries: ['http://registry1.com'],
          mocks: {
            plugins: {
              static: { oldPlugin: 'oldValue' }
            }
          },
          development: {
            plugins: {
              static: { newPlugin: 'newValue' }
            }
          }
        };
        data.fs.readFileSync.returns(JSON.stringify(mockConfig));
      });

      it('should prioritize development plugins over deprecated mocks', () => {
        const result = data.ocConfig.getOcConfig();
        expect(result.development.plugins.static).to.eql({ newPlugin: 'newValue' });
      });
    });

    describe('when config has no registries', () => {
      let data;
      beforeEach(() => {
        data = initialise();
        const mockConfig = {
          development: {
            plugins: {}
          }
        };
        data.fs.readFileSync.returns(JSON.stringify(mockConfig));
      });

      it('should return empty registries array', () => {
        const result = data.ocConfig.getOcConfig();
        expect(result.registries).to.eql([]);
      });
    });

    describe('when config has no development section', () => {
      let data;
      beforeEach(() => {
        data = initialise();
        const mockConfig = {
          registries: ['http://registry1.com']
        };
        data.fs.readFileSync.returns(JSON.stringify(mockConfig));
      });

      it('should return empty plugins object', () => {
        const result = data.ocConfig.getOcConfig();
        expect(result.development.plugins).to.eql({});
      });
    });

    describe('when config file does not exist', () => {
      let data;
      beforeEach(() => {
        data = initialise();
        data.fs.readFileSync.throws(new Error('File not found'));
      });

      it('should return default config', () => {
        const result = data.ocConfig.getOcConfig();
        expect(result).to.eql({
          registries: [],
          development: {
            plugins: {}
          }
        });
      });
    });

    describe('when config file contains invalid JSON', () => {
      let data;
      beforeEach(() => {
        data = initialise();
        data.fs.readFileSync.returns('invalid json content');
      });

      it('should return default config', () => {
        const result = data.ocConfig.getOcConfig();
        expect(result).to.eql({
          registries: [],
          development: {
            plugins: {}
          }
        });
      });
    });

    describe('when oc.json is in both root and component folder', () => {
      let data;
      beforeEach(() => {
        data = initialise();
        const mockConfig = {
          registries: ['http://registry1.com'],
          development: {
            plugins: {
              static: { testPlugin: 'testValue' }
            }
          }
        };
        data.fs.readFileSync.returns(JSON.stringify(mockConfig));
        // Reset existsSync to return false by default
        data.fs.existsSync.reset();
        data.fs.existsSync.returns(false);
        // Set up the path resolution: component folder has oc.json
        data.fs.existsSync.withArgs('/root/components/oc.json').returns(true);
      });

      it('should use components folder oc.json as default', () => {
        const result = data.ocConfig.getOcConfig('/root/components/');
        expect(data.fs.readFileSync.calledWith('/root/components/oc.json', 'utf8')).to.be.true;
      });
    });

    describe('when oc.json is in root folder but not component folder', () => {
      let data;
      beforeEach(() => {
        data = initialise();
        const mockConfig = {
          registries: ['http://registry1.com'],
          development: {
            plugins: {
              static: { testPlugin: 'testValue' }
            }
          }
        };
        data.fs.readFileSync.returns(JSON.stringify(mockConfig));
        // Reset existsSync to return false by default
        data.fs.existsSync.reset();
        data.fs.existsSync.returns(false);
        // Set up the path resolution: component folder doesn't have oc.json, but root does
        data.fs.existsSync.withArgs('/root/components/oc.json').returns(false);
        data.fs.existsSync.withArgs('/root/oc.json').returns(true);
      });

      it('should use root oc.json', () => {
        const result = data.ocConfig.getOcConfig('/root/components/');
        expect(data.fs.readFileSync.calledWith('/root/oc.json', 'utf8')).to.be.true;
        expect(result.sourcePath).to.equal('/root/oc.json');
      });
    });
  });

  describe('setOcConfig', () => {
    describe('when setting valid config', () => {
      let data;
      beforeEach(() => {
        data = initialise();
        const config = {
          registries: ['http://registry1.com'],
          development: {
            plugins: {
              static: { testPlugin: 'testValue' }
            }
          }
        };
        data.ocConfig.setOcConfig(config);
      });

      it('should write config to file', () => {
        expect(data.fs.writeFileSync.called).to.be.true;
      });

      it('should use default config file path when no path provided', () => {
        expect(data.fs.writeFileSync.calledWith('./oc.json')).to.be.true;
      });

      it('should write stringified JSON with proper formatting', () => {
        const writeCall = data.fs.writeFileSync.getCall(0);
        const writtenContent = writeCall.args[1];
        const parsedContent = JSON.parse(writtenContent);
        expect(parsedContent.registries).to.eql(['http://registry1.com']);
        expect(parsedContent.development.plugins.static).to.eql({ testPlugin: 'testValue' });
      });
    });

    describe('when setting config with custom path', () => {
      let data;
      beforeEach(() => {
        data = initialise();
        const config = {
          registries: ['http://registry1.com'],
          development: {
            plugins: {}
          }
        };
        data.ocConfig.setOcConfig(config, './custom-config.json');
      });

      it('should use provided path', () => {
        expect(data.fs.writeFileSync.calledWith('./custom-config.json')).to.be.true;
      });
    });

    describe('when setting config with mocks structure', () => {
      let data;
      beforeEach(() => {
        data = initialise();
        const config = {
          registries: ['http://registry1.com'],
          mocks: {
            plugins: {
              static: { oldPlugin: 'oldValue' }
            }
          },
          development: {
            plugins: {
              static: { newPlugin: 'newValue' }
            }
          }
        };
        data.ocConfig.setOcConfig(config);
      });

      it('should merge mocks into development plugins', () => {
        const writeCall = data.fs.writeFileSync.getCall(0);
        const writtenContent = writeCall.args[1];
        const parsedContent = JSON.parse(writtenContent);
        expect(parsedContent.development.plugins.static).to.eql({ newPlugin: 'newValue' });
      });
    });

    describe('when setting config with fallback settings', () => {
      let data;
      beforeEach(() => {
        data = initialise();
        const config = {
          registries: ['http://registry1.com'],
          development: {
            plugins: {},
            fallback: {
              url: 'http://fallback.com',
              client: true
            }
          }
        };
        data.ocConfig.setOcConfig(config);
      });

      it('should preserve fallback settings', () => {
        const writeCall = data.fs.writeFileSync.getCall(0);
        const writtenContent = writeCall.args[1];
        const parsedContent = JSON.parse(writtenContent);
        expect(parsedContent.development.fallback).to.eql({
          url: 'http://fallback.com',
          client: true
        });
      });
    });
  });
});
