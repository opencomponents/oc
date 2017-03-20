'use strict';

var expect = require('chai').expect;
var fs = require('fs-extra');
var path = require('path');
var sinon = require('sinon');
var packageServerScript = require('../../../src/cli/domain/package-server-script/index.js');
var hashBuilder = require('../../../src/utils/hash-builder');

var serverName = 'server.js';
var componentName = 'component';
var componentPath = path.resolve(__dirname, componentName);
var publishPath = path.resolve(componentPath, '_package');
var webpackOptions = {
  stats: 'none'
};

describe('cli : domain : package-server-script', function(){
  beforeEach(function(done){
    if(!fs.existsSync(componentPath)) {
      fs.mkdirSync(componentPath);
      fs.mkdirSync(path.resolve(componentPath, '_package'));
    }
    done();
  });

  afterEach(function(done){
    if(fs.existsSync(componentPath)) {
      fs.removeSync(componentPath);
    }
    done();
  });

  describe('when packaging component\'s server.js', function(){
    this.timeout(15000);


    describe('when component implements not-valid javascript', function(){
      var serverContent = '\nmodule.exports.data=function(context,cb){\nreturn cb(null,data; };';

      beforeEach(function(done){
        fs.writeFileSync(path.resolve(componentPath, serverName), serverContent);
        done();
      });

      it('should throw an error with error details', function(done){
        try {
          packageServerScript(
            {
              componentPath: componentPath,
              ocOptions: {
                files: {
                  data: serverName
                }
              },
              publishPath: publishPath,
              webpack: webpackOptions
            },
            function(err, res){
              try {
                expect(err.toString()).to.contain.contain('Unexpected token, expected , (3:19)');
                return done();
              } catch(e) {
                return done(e);
              }
              return done('error');
            }
          );
        } catch (e) {
          expect(e).to.contain.contain('Unexpected token, expected , (3:19)');
          return done();
        }
      });
    });

    describe('when component does not require any json', function(){
      var serverContent = '\nmodule.exports.data=function(context,cb){\nreturn cb(null, {name:\'John\'});\n};';

      beforeEach(function(done){
        fs.writeFileSync(path.resolve(componentPath, serverName), serverContent);
        done();
      });

      it('should save compiled data provider and return a hash for the script', function(done){
        packageServerScript(
          {
            componentPath: componentPath,
            ocOptions: {
              files: {
                data: serverName
              }
            },
            publishPath: publishPath,
            webpack: webpackOptions
          },
          function(err, res){
            if (err) {
              return done(err);
            }
            try {
              expect(res.type).to.equal('node.js');
              expect(res.src).to.equal('server.js');

              var compiledContent = fs.readFileSync(path.resolve(publishPath, res.src), {encoding: 'utf8'});
              expect(res.hashKey).to.equal(hashBuilder.fromString(compiledContent));
              done();
            } catch(e) {
              done(e);
            }
          }
        );
      });
    });

    describe('when component require a json file', function(){
      var user = {first: 'John',last:'Doe'};
      var jsonContent = JSON.stringify(user);
      var serverContent = 'var user = require(\'./user\');\nmodule.exports.data=function(){return user.first;};';

      beforeEach(function(done){
        fs.writeFileSync(path.resolve(componentPath, 'user.json'), jsonContent);
        fs.writeFileSync(path.resolve(componentPath, serverName), serverContent);
        done();
      });

      afterEach(function(done){
        require.cache[path.resolve(publishPath, serverName)] = null;
        done();
      });

      it('should save compiled data provider encapsulating json content', function(done){
        packageServerScript(
          {
            componentPath: componentPath,
            ocOptions: {
              files: {
                data: serverName
              }
            },
            publishPath: publishPath,
            webpack: webpackOptions
          },
          function(err, res){
            if (err) {
              return done(err);
            }
            try {
              var name = user.first;
              var bundle = require(path.resolve(publishPath, res.src));
              expect(bundle.data()).to.be.equal(name);

              var compiledContent = fs.readFileSync(path.resolve(publishPath, res.src), {encoding: 'utf8'});
              expect(compiledContent).to.contain('John');
              done();
            } catch(e) {
              done(e);
            }
          }
        );
      });
    });

    describe('when component does require an npm module', function(){
      var serverContent = 'var _ =require(\'underscore\');'
        + '\nvar user = {name:\'John\'};\nmodule.exports.data=function(context,cb){'
        + '\nreturn cb(null, _.has(user, \'name\'));\n};';

      beforeEach(function(done){
        fs.writeFileSync(path.resolve(componentPath, serverName), serverContent);
        done();
      });

      it('should save compiled data provider', function(done){
        var dependencies = {underscore: '1.8.3'};

        packageServerScript(
          {
            componentPath: componentPath,
            ocOptions: {
              files: {
                data: serverName
              }
            },
            publishPath: publishPath,
            webpack: webpackOptions,
            dependencies: dependencies
          },
          function(err, res){
            if (err) {
              return done(err);
            }
            try {
              expect(res.type).to.equal('node.js');
              expect(res.src).to.equal('server.js');

              var compiledContent = fs.readFileSync(path.resolve(publishPath, res.src), {encoding: 'utf8'});
              expect(res.hashKey).to.equal(hashBuilder.fromString(compiledContent));
              done();
            } catch(e) {
              done(e);
            }
          }
        );
      });

      describe('and required dependencies are not present in the package.json', function(){
        it('should throw an error with details', function(done){
          var dependencies = {lodash: '1.0.0'};

          packageServerScript(
            {
              componentPath: componentPath,
              ocOptions: {
                files: {
                  data: serverName
                }
              },
              publishPath: publishPath,
              webpack: webpackOptions,
              dependencies: dependencies
            },
            function(err, res){
              expect(err).to.not.be.null;
              expect(err).to.contain('Missing dependencies from package.json => "underscore"');
              done();
            }
          );
        });
      });
    });

    describe('when component does require a relative path from an npm module', function(){
      var serverContent = 'var data=require(\'react-dom/server\');module.exports.data=function(context,cb){return cb(null,data); };';

      beforeEach(function(done){
        fs.writeFileSync(path.resolve(componentPath, serverName), serverContent);
        done();
      });

      describe('and required dependencies are not present in the package.json', function(){
        it('should throw an error with details', function(done){
          var dependencies = {'react': '15.4.2'};

          packageServerScript(
            {
              componentPath: componentPath,
              ocOptions: {
                files: {
                  data: serverName
                }
              },
              publishPath: publishPath,
              webpack: webpackOptions,
              dependencies: dependencies
            },
            function(err, res){
              expect(err).to.not.be.null;
              expect(err.toString()).to.contain('Missing dependencies from package.json => "react-dom"');
              done();
            }
          );
        });
      });
    });

    describe('when component require a local js module', function(){
      var jsContent = 'var user = {first: \'John\',last:\'Doe\'};\nmodule.exports = user';
      var serverContent = 'var user = require(\'./user\');\nmodule.exports.data=function(){return user.first;};';

      beforeEach(function(done){
        fs.writeFileSync(path.resolve(componentPath, 'user.js'), jsContent);
        fs.writeFileSync(path.resolve(componentPath, serverName), serverContent);
        done();
      });

      afterEach(function(done){
        require.cache[path.resolve(publishPath, serverName)] = null;
        done();
      });

      it('should save compiled data provider encapsulating js module content', function(done){
        packageServerScript(
          {
            componentPath: componentPath,
            ocOptions: {
              files: {
                data: serverName
              }
            },
            publishPath: publishPath,
            webpack: webpackOptions
          },
          function(err, res){
            if (err) {
              return done(err);
            }
            try {
              var name = 'John';
              var bundle = require(path.resolve(publishPath, res.src));
              expect(bundle.data()).to.be.equal(name);
              done();
            } catch(e) {
              done(e);
            }
          }
        );
      });
    });

    describe('when component uses es2015 javascript syntax', function(){
      var serverContent = 'const {first, last} = {first: "John", last: "Doe"};\nconst data = (context,cb) => cb(null, first, last)\nexport {data}';

      beforeEach(function(done){
        fs.writeFileSync(path.resolve(componentPath, serverName), serverContent);
        done();
      });

      it('should transpile it to es2015 through Babel', function(done){
        packageServerScript(
          {
            componentPath: componentPath,
            ocOptions: {
              files: {
                data: serverName
              }
            },
            publishPath: publishPath,
            webpack: webpackOptions
          },
          function(err, res){
            if (err) {
              return done(err);
            }
            try {
              var compiledContent = fs.readFileSync(path.resolve(publishPath, res.src), {encoding: 'utf8'});
              expect(compiledContent).to.not.contain('=>');
              expect(compiledContent).to.not.contain('const');
              expect(compiledContent).to.contain('var');
              expect(compiledContent).to.contain('function');
              done();
            } catch(e) {
              done(e);
            }
          }
        );
      });
    });

    describe('when component code includes a loop', function(){
      var serverContent = 'module.exports.data=function(context,cb){ var x,y,z;'
        + 'while(true){ x = 234; }'
        + 'for(var i=1e12;;){ y = 546; }'
        + 'do { z = 342; } while(true);'
        + '}';

      beforeEach(function(done){
        fs.writeFileSync(path.resolve(componentPath, serverName), serverContent);
        done();
      });

      it('should wrap while/do/for;; loops with an iterator limit', function(done){
        packageServerScript(
          {
            componentPath: componentPath,
            ocOptions: {
              files: {
                data: serverName
              }
            },
            publishPath: publishPath,
            webpack: webpackOptions
          },
          function(err, res){
            if (err) {
              return done(err);
            }
            try {
              var compiledContent = fs.readFileSync(path.resolve(publishPath, res.src), {encoding: 'utf8'});
              expect(compiledContent).to.contain('for(var r,a,t,i=1e9;;){if(i<=0)throw new Error(\"loop exceeded maximum allowed iterations\");r=234,i--}');
              expect(compiledContent).to.contain('for(var i=1e9;;){if(i<=0)throw new Error(\"loop exceeded maximum allowed iterations\");a=546,i--}');
              expect(compiledContent).to.contain('for(var i=1e9;;){if(i<=0)throw new Error(\"loop exceeded maximum allowed iterations\");t=342,i--}');
              done();
            } catch(e) {
              done();
            }
          }
        );
      });
    });

    describe('when component uses es2015', function(){
      describe('and requires a local js module', function(){
        describe('and requires a json file', function(){
          describe('and includes for loops', function(){
            var someJsonContent = JSON.stringify({firstName: 'John', lastName: 'Doe'});
            var someJsModuleContent = 'const infiniteLoops = () => {' +
              'let x, y, z;' +
              'while(true){ x = 234; }' +
              'for(var i=1e12;;){ y = 546; }' +
              'do { z = 342; } while(true);' +
              '};' +
              'const sayHello = (name) => {' +
              '  if(name!=="John Doe") infiniteLoops();' +
              '  return `Hello ${name}`;' +
              '};' +
              'export default sayHello;';

            var serverContent = 'import sayHello from \'./someModule\';' +
              'import user from \'./someData\';' +
              'const {firstName: first, lastName: last} = user;' +
              'const hello = sayHello(`${first} ${last}`);' +
              'const data = (context, callback) => callback(null, { hello });' +
              'export {data}';

            var error, result;

            beforeEach(function(done){
              fs.writeFileSync(path.resolve(componentPath, 'someModule.js'), someJsModuleContent);
              fs.writeFileSync(path.resolve(componentPath, 'someData.json'), someJsonContent);
              fs.writeFileSync(path.resolve(componentPath, serverName), serverContent);
              packageServerScript(
                {
                  componentPath: componentPath,
                  ocOptions: {
                    files: {
                      data: serverName
                    }
                  },
                  publishPath: publishPath,
                  webpack: webpackOptions
                },
                function(err, res){
                  error = err;
                  result = res;
                  done();
                }
              );
            });

            afterEach(function(done){
              require.cache[path.resolve(publishPath, serverName)] = null;
              done();
            });

            it('should save compiled data provider', function(){
              expect(error).to.be.null;
            });

            it('save compiled data provide should work as expected', function(){
              var bundle = require(path.resolve(publishPath, result.src));
              var callback = sinon.spy();
              bundle.data({}, callback);
              expect(callback.args[0][0]).to.be.null;
              expect(callback.args[0][1]).to.deep.equal({ hello: 'Hello John Doe' });
            });

            it('should wrap while/do/for;; loops with an iterator limit', function(){
              var compiledContent = fs.readFileSync(path.resolve(publishPath, result.src), {encoding: 'utf8'});
              expect(compiledContent.match(/Loop exceeded maximum allowed iterations/g).length).to.equal(3);
            });
          });
        });
      });
    });
  });
});
