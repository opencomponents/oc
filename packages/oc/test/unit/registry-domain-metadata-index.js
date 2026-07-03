const { expect } = require('chai');
const sinon = require('sinon');

const {
  createMetadataIndex,
  getComponentsListFromRows,
  getComponentsDetailsFromRows,
  getComponentRow
} = require('../../dist/registry/domain/metadata-index');

const rows = [
  { name: 'hello-world', version: '1.0.0', publishDate: 123, templateSize: 10 },
  { name: 'hello-world', version: '2.0.0', publishDate: 125 },
  { name: 'welcome', version: '1.0.0', publishDate: 124, templateSize: 20 }
];

describe('registry : domain : metadata-index', () => {
  describe('getComponentsListFromRows()', () => {
    it('should group versions per component and sort them by semver', () => {
      const list = getComponentsListFromRows([
        { name: 'a', version: '2.0.0', publishDate: 2 },
        { name: 'a', version: '1.0.0', publishDate: 1 },
        { name: 'a', version: '10.0.0', publishDate: 3 }
      ]);

      expect(list.components).to.eql({ a: ['1.0.0', '2.0.0', '10.0.0'] });
    });

    it('should derive lastEdit from the most recent publishDate', () => {
      expect(getComponentsListFromRows(rows).lastEdit).to.equal(125);
    });

    it('should produce lastEdit 0 for an empty registry', () => {
      expect(getComponentsListFromRows([]).lastEdit).to.equal(0);
    });
  });

  describe('getComponentsDetailsFromRows()', () => {
    it('should map rows to per-version details and omit absent templateSize', () => {
      const details = getComponentsDetailsFromRows(rows);

      expect(details.components).to.eql({
        'hello-world': {
          '1.0.0': { publishDate: 123, templateSize: 10 },
          '2.0.0': { publishDate: 125 }
        },
        welcome: {
          '1.0.0': { publishDate: 124, templateSize: 20 }
        }
      });
      expect(details.lastEdit).to.equal(125);
    });
  });

  describe('getComponentRow()', () => {
    it('should build a row from a package.json component', () => {
      expect(
        getComponentRow('hello-world', '1.2.3', {
          oc: { date: 999, files: { template: { size: 42 } } }
        })
      ).to.eql({
        name: 'hello-world',
        version: '1.2.3',
        publishDate: 999,
        templateSize: 42
      });
    });

    it('should default publishDate to 0 when the component has no date', () => {
      expect(
        getComponentRow('hello-world', '1.0.0', {
          oc: { files: { template: { size: 1 } } }
        }).publishDate
      ).to.equal(0);
    });
  });

  describe('createMetadataIndex()', () => {
    const getStore = (storeRows = rows) => ({
      getAllComponents: sinon.stub().resolves(storeRows)
    });

    describe('refresh() / get() / getOrRefresh()', () => {
      it('should hydrate both caches from a single getAllComponents call', async () => {
        const store = getStore();
        const index = createMetadataIndex(store);

        const snapshot = await index.refresh();

        expect(store.getAllComponents.calledOnce).to.be.true;
        expect(snapshot.componentsList.components).to.eql({
          'hello-world': ['1.0.0', '2.0.0'],
          welcome: ['1.0.0']
        });
        expect(snapshot.componentsDetails.components['welcome']).to.eql({
          '1.0.0': { publishDate: 124, templateSize: 20 }
        });
      });

      it('get() should return undefined before any hydration', () => {
        expect(createMetadataIndex(getStore()).get()).to.be.undefined;
      });

      it('getOrRefresh() should hydrate once then reuse the snapshot', async () => {
        const store = getStore();
        const index = createMetadataIndex(store);

        const first = await index.getOrRefresh();
        const second = await index.getOrRefresh();

        expect(store.getAllComponents.calledOnce).to.be.true;
        expect(second).to.equal(first);
      });

      it('should skip full rehydration when the metadata change token is unchanged', async () => {
        const store = {
          getAllComponents: sinon.stub().resolves(rows),
          getChangeToken: sinon.stub().resolves('token-1')
        };
        const index = createMetadataIndex(store);

        const first = await index.refresh();
        const second = await index.refresh();

        expect(store.getChangeToken.calledTwice).to.be.true;
        expect(store.getAllComponents.calledOnce).to.be.true;
        expect(second).to.equal(first);
      });

      it('should rehydrate when the metadata change token changes', async () => {
        const store = {
          getAllComponents: sinon
            .stub()
            .onFirstCall()
            .resolves(rows)
            .onSecondCall()
            .resolves([
              ...rows,
              { name: 'fresh', version: '1.0.0', publishDate: 200 }
            ]),
          getChangeToken: sinon
            .stub()
            .onFirstCall()
            .resolves('token-1')
            .onSecondCall()
            .resolves('token-2')
        };
        const index = createMetadataIndex(store);

        await index.refresh();
        const second = await index.refresh();

        expect(store.getAllComponents.calledTwice).to.be.true;
        expect(second.componentsList.components.fresh).to.eql(['1.0.0']);
      });

      it('should force a periodic full rehydration even when the token is unchanged', async () => {
        const now = sinon.stub(Date, 'now');
        now.onFirstCall().returns(0);
        now.onSecondCall().returns(5 * 60 * 1000 + 1);
        const store = {
          getAllComponents: sinon.stub().resolves(rows),
          getChangeToken: sinon.stub().resolves('token-1')
        };
        const index = createMetadataIndex(store);

        try {
          await index.refresh();
          await index.refresh();
        } finally {
          now.restore();
        }

        expect(store.getAllComponents.calledTwice).to.be.true;
      });
    });

    describe('add()', () => {
      it('should build a snapshot from a single row when none exists yet', () => {
        const index = createMetadataIndex(getStore());

        const snapshot = index.add({
          name: 'brand-new',
          version: '1.0.0',
          publishDate: 10,
          templateSize: 5
        });

        expect(snapshot.componentsList.components).to.eql({
          'brand-new': ['1.0.0']
        });
        expect(snapshot.componentsDetails.components).to.eql({
          'brand-new': { '1.0.0': { publishDate: 10, templateSize: 5 } }
        });
        expect(snapshot.componentsList.lastEdit).to.equal(10);
      });

      it('should append a new version to an existing component in semver order', async () => {
        const index = createMetadataIndex(getStore());
        await index.refresh();

        const snapshot = index.add({
          name: 'hello-world',
          version: '1.5.0',
          publishDate: 200
        });

        expect(snapshot.componentsList.components['hello-world']).to.eql([
          '1.0.0',
          '1.5.0',
          '2.0.0'
        ]);
        expect(
          snapshot.componentsDetails.components['hello-world']['1.5.0']
        ).to.eql({ publishDate: 200 });
        expect(snapshot.componentsList.lastEdit).to.equal(200);
      });

      it('should add a brand-new component without touching others', async () => {
        const index = createMetadataIndex(getStore());
        await index.refresh();

        const snapshot = index.add({
          name: 'fresh',
          version: '3.0.0',
          publishDate: 300,
          templateSize: 9
        });

        expect(Object.keys(snapshot.componentsList.components)).to.have.members([
          'hello-world',
          'welcome',
          'fresh'
        ]);
        expect(snapshot.componentsList.components['fresh']).to.eql(['3.0.0']);
      });

      it('should be a no-op when the version already exists', async () => {
        const index = createMetadataIndex(getStore());
        const before = await index.refresh();

        const after = index.add({
          name: 'hello-world',
          version: '1.0.0',
          publishDate: 999
        });

        expect(after).to.equal(before);
        expect(after.componentsList.lastEdit).to.equal(125);
        expect(
          after.componentsDetails.components['hello-world']['1.0.0']
        ).to.eql({ publishDate: 123, templateSize: 10 });
      });

      it('should not advance lastEdit backwards', async () => {
        const index = createMetadataIndex(getStore());
        await index.refresh();

        const snapshot = index.add({
          name: 'welcome',
          version: '0.5.0',
          publishDate: 1
        });

        expect(snapshot.componentsList.lastEdit).to.equal(125);
      });

      it('should not mutate a previously returned snapshot (immutability)', async () => {
        const index = createMetadataIndex(getStore());
        const previous = await index.refresh();
        const previousHelloVersions =
          previous.componentsList.components['hello-world'];

        index.add({ name: 'hello-world', version: '1.5.0', publishDate: 200 });

        // The earlier snapshot must keep its original view.
        expect(previous.componentsList.components['hello-world']).to.equal(
          previousHelloVersions
        );
        expect(previous.componentsList.components['hello-world']).to.eql([
          '1.0.0',
          '2.0.0'
        ]);
        expect(
          previous.componentsDetails.components['hello-world']['1.5.0']
        ).to.be.undefined;
      });

      it('should share untouched component entries by reference with the new snapshot', async () => {
        const index = createMetadataIndex(getStore());
        const previous = await index.refresh();

        const next = index.add({
          name: 'hello-world',
          version: '1.5.0',
          publishDate: 200
        });

        // welcome was not touched, so its detail object is reused as-is.
        expect(next.componentsDetails.components['welcome']).to.equal(
          previous.componentsDetails.components['welcome']
        );
      });
    });
  });
});
