'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('registry : domain : components-details', () => {
  const fireStub = sinon.stub();
  const ComponentsDetails = injectr(
    '../../dist/registry/domain/components-details.js',
    {
      './events-handler': { fire: fireStub },
      'oc-get-unix-utc-timestamp': () => 1234567890
    }
  ).default;

  const conf = {
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
      .then(res => (result = res))
      .catch(err => (error = err))
      .finally(done);

  describe('get()', () => {
    describe('when details file exists on cdn', () => {
      let details;
      let stubs;

      before(done => {
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
    });

    describe('when details file does not exist on cdn', () => {
      before(done => {
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

        before(done => {
          stubs = { getJson: sinon.stub() };
          stubs.getJson.onCall(0).resolves(details);
          stubs.getJson.onCall(1).resolves({ oc: { date: 1459864868001 } });
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
          before(done => {
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
          before(done => {
            stubs = { getJson: sinon.stub() };
            stubs.getJson.onCall(0).resolves(details);
            stubs.getJson.onCall(1).resolves({ oc: { date: 1459864868001 } });
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
                    '1.0.1': { publishDate: 1459864868001 }
                  }
                }
              })
            );
          });

          describe('when component details save fails', () => {
            before(done => {
              fireStub.reset();
              stubs = { getJson: sinon.stub() };
              stubs.getJson.onCall(0).resolves(details);
              stubs.getJson.onCall(1).resolves({ oc: { date: 1459864868001 } });
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
                .then(res => (result = res))
                .catch(err => (error = err))
                .finally(done);

            before(done => {
              stubs = { getJson: sinon.stub() };
              stubs.getJson.onCall(0).resolves(details);
              stubs.getJson.onCall(1).resolves({ oc: { date: 1459864868001 } });
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
                    '1.0.1': { publishDate: 1459864868001 }
                  }
                }
              });
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
            .then(res => (result = res))
            .catch(err => (error = err))
            .finally(done);

        before(done => {
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

      before(done => {
        stubs = { getJson: sinon.stub() };
        stubs.getJson.onCall(0).resolves('not found');
        stubs.getJson.onCall(1).resolves({ oc: { date: 1459864868000 } });
        stubs.getJson.onCall(2).resolves({ oc: { date: 1459864868001 } });
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
        before(done => {
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
        before(done => {
          stubs = { getJson: sinon.stub() };
          stubs.getJson.onCall(0).rejects('not found');
          stubs.getJson.onCall(1).resolves({ oc: { date: 1459864868000 } });
          stubs.getJson.onCall(2).resolves({ oc: { date: 1459864868001 } });
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
                  '1.0.1': { publishDate: 1459864868001 }
                }
              }
            })
          );
        });

        describe('when component details save fails', () => {
          before(done => {
            fireStub.reset();
            stubs = { getJson: sinon.stub() };
            stubs.getJson.onCall(0).rejects('not found');
            stubs.getJson.onCall(1).resolves({ oc: { date: 1459864868000 } });
            stubs.getJson.onCall(2).resolves({ oc: { date: 1459864868001 } });
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
              .then(res => (result = res))
              .catch(err => (error = err))
              .finally(done);

          before(done => {
            stubs = { getJson: sinon.stub() };
            stubs.getJson.onCall(0).rejects('not found');
            stubs.getJson.onCall(1).resolves({ oc: { date: 1459864868000 } });
            stubs.getJson.onCall(2).resolves({ oc: { date: 1459864868001 } });
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
                  '1.0.1': { publishDate: 1459864868001 }
                }
              }
            });
          });
        });
      });
    });
  });
});
