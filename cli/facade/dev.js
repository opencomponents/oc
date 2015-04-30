'use strict';

var async = require('async');
var colors = require('colors');
var format = require('stringformat');
var fs = require('fs-extra');
var npm = require('npm');
var oc = require('../../index');
var path = require('path');
var strings = require('../../resources/index');
var watch = require('watch');
var _ = require('underscore');

module.exports = function(dependencies){
  var local = dependencies.local,
      logger = dependencies.logger;

  return function(opts){
    npm.load({}, function(npmEr){
      if(npmEr){ throw npmEr; }

      var componentsDir = opts.dirName,
          port = opts.port || 3000,
          packaging = false,
          errors = strings.errors.cli;

      var getDepsFromComponents = function(components){
        var deps = {};
        _.forEach(components, function(c){
          var pkg = fs.readJsonSync(path.join(c, 'package.json'));
          _.forEach(_.keys(pkg.dependencies), function(d){
            if(!deps[d]){
              deps[d] = {};
            }
          });
        });

        return deps;
      };

      var installMissingDeps = function(missing, cb){
        logger.log(('Trying to install missing modules: ' + JSON.stringify(missing)).yellow);
        logger.log('If you aren\'t connected to the internet, or npm isn\'t configured then this step will fail');
        npm.commands.install(path.resolve(componentsDir), missing, function(err, data){
          if(err){
            logger.log(err.toString().red);
            throw err;
          }
          cb();
        });
      };

      var watchForChanges = function(components){
        try {
          watch.watchTree(path.resolve(componentsDir), {
            ignoreUnreadableDir: true,
            ignoreDotFiles: false
          }, function(fileName, currentStat, previousStat){
            if(!!currentStat || !!previousStat){
              if(/node_modules|package.tar.gz|_package/gi.test(fileName) === false){
                logger.log('Changes detected on file: '.yellow + fileName);
                packageComponents(components);
              }
            }
          });
        } catch(er){
          logger.log(format('An error happened: {0}'.red, er));
        }
      };

      var packageComponents = function(componentsDirs, callback){
        var i = 0;

        if(!packaging){
          packaging = true;
          logger.log('Packaging components...'.yellow);

          async.eachSeries(componentsDirs, function(dir, cb){
            local.package(dir, false, function(err){
              if(!err){
                i++;
              }
              cb(err);
            });
          }, function(error){
            if(!!error){
              var errorDescription = (error instanceof SyntaxError) ? error.message : error;
              logger.log(format('An error happened while packaging {0}: {1}', componentsDirs[i], errorDescription.red));
              logger.log('retrying in 10 seconds...'.yellow);
              setTimeout(function(){
                packaging = false;
                packageComponents(componentsDirs);
              }, 10000);
            } else {
              packaging = false;
              logger.log('complete'.green);
              if(_.isFunction(callback)){
                callback();
              }
            }
          });
        }
      };

      var loadDependencies = function(components, cb){
        logger.log('Ensuring dependencies are loaded'.yellow);

        var dependencies = getDepsFromComponents(components),
            missing = [];

        async.eachSeries(_.keys(dependencies), function(npmModule, done){
          var pathToModule = path.resolve('node_modules/', npmModule);

          try {
            if(!!require.cache[pathToModule]){
              delete require.cache[pathToModule];
            }

            dependencies[npmModule] = require(pathToModule);
          } catch (exception) {
            logger.log(('Error loading module: ' + npmModule + ' => ' + exception).red);
            missing.push(npmModule);
          }

          return done();
        }, function(err){
          if(missing.length > 0){
            installMissingDeps(missing, function(){
              loadDependencies(components, function(loadedDependencies){
                cb(loadedDependencies);
              });
            });
          } else {
            cb(dependencies);
          }
        });
      };

      logger.log('Looking for components...'.yellow);
      local.getComponentsByDir(componentsDir, function(err, components){

        if(err){
          return logger.log(err.red);
        } else if(components.length === 0){
          return logger.log(format(errors.DEV_FAIL, errors.COMPONENTS_NOT_FOUND).red);
        }

        loadDependencies(components, function(dependencies){
          packageComponents(components, function(){
            logger.log('Starting dev registry on localhost:' + port);
            
            var conf = {
              local: true,
              path: path.resolve(componentsDir),
              port: port,
              baseUrl: format('http://localhost:{0}/', port),
              env: { name: 'local' }
            };
            
            var registry = new oc.Registry(_.extend(conf, { dependencies: dependencies }));

            registry.start(function(err, app){

              if(err){
                if(err.code === 'EADDRINUSE'){
                  return logger.log(format('The port {0} is already in use. Specify the optional port parameter to use another port.', port).red);
                } else {
                  logger.log(err.red);
                }
              }

              watchForChanges(components);
            });
          });
        });
      });
    });
  };
};
