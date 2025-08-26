const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

const initialise = () => {
  const fsMock = {
    readFileSync: sinon.stub(),
    writeFileSync: sinon.stub()
  };

  const settingsMock = {
    configFile: {
      src: './oc.json'
    }
  };

  const ocConfig = injectr(
    '../../dist/cli/domain/ocConfig.js',
    {
      'node:fs': fsMock,
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

      it('should use default config file path when no path provided', () => {
        data.ocConfig.getOcConfig();
        expect(data.fs.readFileSync.calledWith('./oc.json', 'utf8')).to.be.true;
      });

      it('should use provided path when specified', () => {
        data.ocConfig.getOcConfig('./custom-config.json');
        expect(data.fs.readFileSync.calledWith('./custom-config.json', 'utf8')).to.be.true;
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
