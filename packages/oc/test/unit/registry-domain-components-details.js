const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('registry : domain : components-details', () => {
  const fireStub = sinon.stub();
  const setTimeoutStub = sinon.stub();
  const clearTimeoutStub = sinon.stub();
  const ComponentsDetails = injectr(
    '../../dist/registry/domain/components-details.js',
    {
      './events-handler': { fire: fireStub },
      'oc-get-unix-utc-timestamp': () => 1234567890
    },
    {
      setTimeout: setTimeoutStub,
      clearTimeout: clearTimeoutStub
    }
  ).default;

  const conf = {
    pollingInterval: 5,
    storage: {
      options: {
        componentsDir: 'components'
      }
    }
  };

  let error;
  let result;

  const next = (promise, done) =>
    promise
      .then((res) => {
        result = res;
      })
      .catch((err) => {
        error = err;
      })
      .finally(done);

  describe('get()', () => {
    describe('when details file exists on cdn', () => {
      let details;
      let stubs;

      before((done) => {
        details = {
          lastEdit: 1459864868000,
          components: {
            hello: {
              '1.0.0': { publishDate: 1459864868000 }
            }
          }
        };

        stubs = { getJson: sinon.stub().resolves(details) };
        const componentsDetails = ComponentsDetails(conf, stubs);
        next(componentsDetails.get(), done);
      });

      it('should not error', () => {
        expect(error).to.be.undefined;
      });

      it('should return the details', () => {
        expect(result).to.eql(details);
      });

      it('should fetch the details from components-details.json', () => {
        expect(stubs.getJson.args[0][0]).to.equal(
          'components/components-details.json'
        );
      });

      it('should cache the details after the first fetch', async () => {
        const cacheStubs = { getJson: sinon.stub().resolves(details) };
        const componentsDetails = ComponentsDetails(conf, cacheStubs);

        await componentsDetails.get();
        await componentsDetails.get();

        expect(cacheStubs.getJson.calledOnce).to.be.true;
      });
    });

    describe('when details file does not exist on cdn', () => {
      before((done) => {
        const stubs = { getJson: sinon.stub().rejects(new Error('an error')) };
        const componentsDetails = ComponentsDetails(conf, stubs);
        next(componentsDetails.get(), done);
      });

      it('should return an error', () => {
        expect(error.message).to.equal('an error');
      });
    });
  });

  describe('refresh()', () => {
    describe('when details file exists on cdn', () => {
      describe('when details file is outdated on cdn', () => {
        const list = {
          lastEdit: 1459864868000,
          components: {
            hello: ['1.0.0', '1.0.1']
          }
        };

        const details = {
          lastEdit: 1459864868000,
          components: {
            hello: {
              '1.0.0': { publishDate: 1459864868000 }
            }
          }
        };

        let stubs;

        before((done) => {
          stubs = { getJson: sinon.stub() };
          stubs.getJson.onCall(0).resolves(details);
          stubs.getJson.onCall(1).resolves({
            oc: { date: 1459864868001, files: { template: { size: 300 } } }
          });
          stubs.maxConcurrentRequests = 20;
          stubs.putFileContent = sinon.stub().resolves('ok');
          const componentsDetails = ComponentsDetails(conf, stubs);
          next(componentsDetails.refresh(list), done);
        });

        it('should fetch the component details for new components', () => {
          expect(stubs.getJson.args[1][0]).to.equal(
            'components/hello/1.0.1/package.json'
          );
        });

        describe('when component details fetch fails', () => {
          before((done) => {
            fireStub.reset();
            stubs = { getJson: sinon.stub() };
            stubs.getJson.onCall(0).resolves(details);
            stubs.getJson.onCall(1).rejects(new Error('error timeout'));
            stubs.maxConcurrentRequests = 20;
            const componentsDetails = ComponentsDetails(conf, stubs);
            next(componentsDetails.refresh(list), done);
          });

          it('should return an error', () => {
            expect(error).to.equal('components_details_get');
          });

          it('should fire an error event', () => {
            expect(fireStub.args[0][0]).to.equal('error');
            expect(fireStub.args[0][1]).to.eql({
              code: 'components_details_get',
              message: 'error timeout'
            });
          });
        });

        describe('when component details fetch succeeds', () => {
          before((done) => {
            stubs = { getJson: sinon.stub() };
            stubs.getJson.onCall(0).resolves(details);
            stubs.getJson.onCall(1).resolves({
              oc: { date: 1459864868001, files: { template: { size: 300 } } }
            });
            stubs.maxConcurrentRequests = 20;
            stubs.putFileContent = sinon.stub().resolves('ok');
            const componentsDetails = ComponentsDetails(conf, stubs);
            next(componentsDetails.refresh(list), done);
          });

          it('should save the updated component details to file', () => {
            expect(stubs.putFileContent.args[0][1]).to.equal(
              'components/components-details.json'
            );
            expect(stubs.putFileContent.args[0][0]).to.eql(
              JSON.stringify({
                lastEdit: 1234567890,
                components: {
                  hello: {
                    '1.0.0': { publishDate: 1459864868000 },
                    '1.0.1': { publishDate: 1459864868001, templateSize: 300 }
                  }
                }
              })
            );
          });

          describe('when component details save fails', () => {
            before((done) => {
              fireStub.reset();
              stubs = { getJson: sinon.stub() };
              stubs.getJson.onCall(0).resolves(details);
              stubs.getJson.onCall(1).resolves({
                oc: {
                  date: 1459864868001,
                  files: { template: { size: 300 } }
                }
              });
              stubs.maxConcurrentRequests = 20;
              stubs.putFileContent = sinon
                .stub()
                .rejects(new Error('could not save'));
              const componentsDetails = ComponentsDetails(conf, stubs);
              next(componentsDetails.refresh(list), done);
            });

            it('should return an error', () => {
              expect(error).to.equal('components_details_save');
            });

            it('should fire an error event', () => {
              expect(fireStub.args[0][0]).to.equal('error');
              expect(fireStub.args[0][1]).to.eql({
                code: 'components_details_save',
                message: 'could not save'
              });
            });
          });

          describe('when component details save succeeds', () => {
            let error;
            let result;

            const next = (promise, done) =>
              promise
                .then((res) => {
                  result = res;
                })
                .catch((err) => {
                  error = err;
                })
                .finally(done);

            before((done) => {
              stubs = { getJson: sinon.stub() };
              stubs.getJson.onCall(0).resolves(details);
              stubs.getJson.onCall(1).resolves({
                oc: { date: 1459864868001, files: { template: { size: 300 } } }
              });
              stubs.maxConcurrentRequests = 20;
              stubs.putFileContent = sinon.stub().resolves('ok');
              const componentsDetails = ComponentsDetails(conf, stubs);
              next(componentsDetails.refresh(list), done);
            });

            it('should not error', () => {
              expect(error).to.be.undefined;
            });

            it('should return result', () => {
              expect(result).to.eql({
                lastEdit: 1234567890,
                components: {
                  hello: {
                    '1.0.0': { publishDate: 1459864868000 },
                    '1.0.1': { publishDate: 1459864868001, templateSize: 300 }
                  }
                }
              });
            });

            it('should cache the refreshed details', async () => {
              const cacheStubs = { getJson: sinon.stub() };
              cacheStubs.getJson.onCall(0).resolves(details);
              cacheStubs.getJson.onCall(1).resolves({
                oc: {
                  date: 1459864868001,
                  files: { template: { size: 300 } }
                }
              });
              cacheStubs.maxConcurrentRequests = 20;
              cacheStubs.putFileContent = sinon.stub().resolves('ok');
              const componentsDetails = ComponentsDetails(conf, cacheStubs);

              await componentsDetails.refresh(list);
              const cachedResult = await componentsDetails.get();

              expect(cachedResult).to.eql({
                lastEdit: 1234567890,
                components: {
                  hello: {
                    '1.0.0': { publishDate: 1459864868000 },
                    '1.0.1': { publishDate: 1459864868001, templateSize: 300 }
                  }
                }
              });
              expect(cacheStubs.getJson.callCount).to.equal(2);
            });
          });
        });
      });

      describe('when details file is up-to-date on cdn', () => {
        const list = {
          lastEdit: 1459864868001,
          components: {
            hello: ['1.0.0', '1.0.1']
          }
        };

        const details = {
          lastEdit: 1459864868001,
          components: {
            hello: {
              '1.0.0': { publishDate: 1459864868000 },
              '1.0.1': { publishDate: 1459864868001 }
            }
          }
        };

        let stubs;
        let error;
        let result;

        const next = (promise, done) =>
          promise
            .then((res) => {
              result = res;
            })
            .catch((err) => {
              error = err;
            })
            .finally(done);

        before((done) => {
          stubs = { getJson: sinon.stub() };
          stubs.getJson.resolves(details);
          stubs.maxConcurrentRequests = 20;
          stubs.putFileContent = sinon.stub().resolves();
          const componentsDetails = ComponentsDetails(conf, stubs);
          next(componentsDetails.refresh(list), done);
        });

        it('should not error', () => {
          expect(error).to.be.undefined;
        });

        it('should not save it', () => {
          expect(stubs.putFileContent.called).to.be.false;
        });

        it('should return the result', () => {
          expect(result).to.eql(details);
        });
      });
    });

    describe('when details file does not exist on cdn', () => {
      const list = {
        lastEdit: 1459864868000,
        components: {
          hello: ['1.0.0', '1.0.1']
        }
      };

      let stubs;

      before((done) => {
        stubs = { getJson: sinon.stub() };
        stubs.getJson.onCall(0).rejects('not found');
        stubs.getJson.onCall(1).resolves({
          oc: { date: 1459864868000, files: { template: { size: 300 } } }
        });
        stubs.getJson.onCall(2).resolves({
          oc: { date: 1459864868001, files: { template: { size: 300 } } }
        });
        stubs.maxConcurrentRequests = 20;
        stubs.putFileContent = sinon.stub().resolves('ok');
        const componentsDetails = ComponentsDetails(conf, stubs);
        next(componentsDetails.refresh(list), done);
      });

      it('should fetch the component details for new components', () => {
        expect(stubs.getJson.args[1][0]).to.equal(
          'components/hello/1.0.0/package.json'
        );
        expect(stubs.getJson.args[2][0]).to.equal(
          'components/hello/1.0.1/package.json'
        );
      });

      describe('when component details fetch fails', () => {
        before((done) => {
          fireStub.reset();
          stubs = { getJson: sinon.stub() };
          stubs.getJson.onCall(0).rejects(new Error('not found'));
          stubs.getJson.onCall(1).rejects(new Error('error timeout'));
          stubs.getJson.onCall(2).rejects(new Error('error timeout'));
          stubs.maxConcurrentRequests = 20;
          const componentsDetails = ComponentsDetails(conf, stubs);
          next(componentsDetails.refresh(list), done);
        });

        it('should return an error', () => {
          expect(error).to.equal('components_details_get');
        });

        it('should fire an error event', () => {
          expect(fireStub.args[0][0]).to.equal('error');
          expect(fireStub.args[0][1]).to.eql({
            code: 'components_details_get',
            message: 'error timeout'
          });
        });
      });

      describe('when component details fetch succeeds', () => {
        before((done) => {
          stubs = { getJson: sinon.stub() };
          stubs.getJson.onCall(0).rejects('not found');
          stubs.getJson.onCall(1).resolves({
            oc: { date: 1459864868000, files: { template: { size: 300 } } }
          });
          stubs.getJson.onCall(2).resolves({
            oc: { date: 1459864868001, files: { template: { size: 300 } } }
          });
          stubs.maxConcurrentRequests = 20;
          stubs.putFileContent = sinon.stub().resolves('ok');
          const componentsDetails = ComponentsDetails(conf, stubs);
          next(componentsDetails.refresh(list), done);
        });

        it('should save the updated component details to file', () => {
          expect(stubs.putFileContent.args[0][1]).to.equal(
            'components/components-details.json'
          );
          expect(stubs.putFileContent.args[0][0]).to.eql(
            JSON.stringify({
              lastEdit: 1234567890,
              components: {
                hello: {
                  '1.0.0': { publishDate: 1459864868000, templateSize: 300 },
                  '1.0.1': { publishDate: 1459864868001, templateSize: 300 }
                }
              }
            })
          );
        });

        describe('when component details save fails', () => {
          before((done) => {
            fireStub.reset();
            stubs = { getJson: sinon.stub() };
            stubs.getJson.onCall(0).rejects('not found');
            stubs.getJson.onCall(1).resolves({
              oc: { date: 1459864868000, files: { template: { size: 300 } } }
            });
            stubs.getJson.onCall(2).resolves({
              oc: { date: 1459864868001, files: { template: { size: 300 } } }
            });
            stubs.maxConcurrentRequests = 20;
            stubs.putFileContent = sinon
              .stub()
              .rejects(new Error('could not save'));
            const componentsDetails = ComponentsDetails(conf, stubs);
            next(componentsDetails.refresh(list), done);
          });

          it('should return an error', () => {
            expect(error).to.equal('components_details_save');
          });

          it('should fire an error event', () => {
            expect(fireStub.args[0][0]).to.equal('error');
            expect(fireStub.args[0][1]).to.eql({
              code: 'components_details_save',
              message: 'could not save'
            });
          });
        });

        describe('when component details save succeeds', () => {
          let error;
          let result;

          const next = (promise, done) =>
            promise
              .then((res) => {
                result = res;
              })
              .catch((err) => {
                error = err;
              })
              .finally(done);

          before((done) => {
            stubs = { getJson: sinon.stub() };
            stubs.getJson.onCall(0).rejects('not found');
            stubs.getJson.onCall(1).resolves({
              oc: { date: 1459864868000, files: { template: { size: 300 } } }
            });
            stubs.getJson.onCall(2).resolves({
              oc: { date: 1459864868001, files: { template: { size: 300 } } }
            });
            stubs.maxConcurrentRequests = 20;
            stubs.putFileContent = sinon.stub().resolves('ok');
            const componentsDetails = ComponentsDetails(conf, stubs);
            next(componentsDetails.refresh(list), done);
          });

          it('should not error', () => {
            expect(error).to.be.undefined;
          });

          it('should return result', () => {
            expect(result).to.eql({
              lastEdit: 1234567890,
              components: {
                hello: {
                  '1.0.0': { publishDate: 1459864868000, templateSize: 300 },
                  '1.0.1': { publishDate: 1459864868001, templateSize: 300 }
                }
              }
            });
          });
        });
      });
    });
  });

  describe('polling', () => {
    const list = {
      lastEdit: 1459864868001,
      components: {
        hello: ['1.0.0', '1.0.1']
      }
    };

    const details = {
      lastEdit: 1459864868001,
      components: {
        hello: {
          '1.0.0': { publishDate: 1459864868000 },
          '1.0.1': { publishDate: 1459864868001 }
        }
      }
    };

    const newerDetails = {
      lastEdit: 1459864868999,
      components: {
        hello: {
          '1.0.0': { publishDate: 1459864868000 },
          '1.0.1': { publishDate: 1459864868001 },
          '2.0.0': { publishDate: 1459864868999 }
        }
      }
    };

    let stubs;
    let componentsDetails;

    beforeEach(async () => {
      setTimeoutStub.reset();
      clearTimeoutStub.reset();
      fireStub.reset();
      stubs = { getJson: sinon.stub().resolves(details) };
      stubs.maxConcurrentRequests = 20;
      stubs.putFileContent = sinon.stub().resolves('ok');
      componentsDetails = ComponentsDetails(conf, stubs);
      await componentsDetails.refresh(list);
    });

    it('should start the polling loop using the configured interval', () => {
      expect(setTimeoutStub.called).to.be.true;
      expect(setTimeoutStub.args[0][1]).to.equal(5000);
    });

    it('should clear the previous loop when refreshing again', async () => {
      await componentsDetails.refresh(list);
      expect(clearTimeoutStub.called).to.be.true;
    });

    it('should restart the loop after each poll', async () => {
      const poll = setTimeoutStub.args[0][0];
      await poll();
      expect(setTimeoutStub.calledTwice).to.be.true;
    });

    it('should update the cache when the polled data is newer', async () => {
      const poll = setTimeoutStub.args[0][0];
      stubs.getJson.resolves(newerDetails);

      await poll();

      expect(await componentsDetails.get()).to.eql(newerDetails);
    });

    it('should keep the cached data when the polled data is not newer', async () => {
      const poll = setTimeoutStub.args[0][0];
      stubs.getJson.resolves({ ...details, lastEdit: details.lastEdit - 1 });

      await poll();

      expect(await componentsDetails.get()).to.eql(details);
    });

    it('should fire an error event when polling fails', async () => {
      const poll = setTimeoutStub.args[0][0];
      fireStub.reset();
      stubs.getJson.rejects(new Error('poll failed'));

      await poll();

      const errorCall = fireStub
        .getCalls()
        .find((call) => call.args[0] === 'error');
      expect(errorCall.args[1]).to.eql({
        code: 'components_details_get',
        message: 'poll failed'
      });
    });
  });

  describe('when metadata store is configured', () => {
    let metadataIndex;
    let stubs;

    before((done) => {
      setTimeoutStub.reset();
      clearTimeoutStub.reset();
      metadataIndex = {
        getOrRefresh: sinon.stub().resolves({
          componentsDetails: {
            lastEdit: 123,
            components: {
              'hello-world': {
                '1.0.0': { publishDate: 123, templateSize: 10 },
                '1.0.1': { publishDate: 124 }
              }
            }
          }
        })
      };
      stubs = {
        getJson: sinon.stub(),
        putFileContent: sinon.stub(),
        maxConcurrentRequests: 20
      };
      const componentsDetails = ComponentsDetails(conf, stubs, metadataIndex);
      next(
        componentsDetails.refresh({
          lastEdit: 123,
          components: { 'hello-world': ['1.0.0', '1.0.1'] }
        }),
        done
      );
    });

    it('should hydrate the details from the metadata store', () => {
      expect(result.components).to.eql({
        'hello-world': {
          '1.0.0': { publishDate: 123, templateSize: 10 },
          '1.0.1': { publishDate: 124 }
        }
      });
      expect(result.lastEdit).to.be.a('number');
    });

    it('should not read or write storage metadata files', () => {
      expect(stubs.getJson.called).to.be.false;
      expect(stubs.putFileContent.called).to.be.false;
    });

    it('should not start a second polling loop', () => {
      expect(setTimeoutStub.called).to.be.false;
    });
  });
});
