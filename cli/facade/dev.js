'use strict';

var colors = require('colors');
var format = require('../../utils/format');
var giveMe = require('give-me');
var path = require('path');
var oc = require('../../index');
var strings = require('../../resources/index');
var watch = require('watch');
var _ = require('underscore');

module.exports = function(dependencies){
  
  var local = dependencies.local,
      logger = dependencies.logger;

  return function(opts){

    var componentsDir = opts.dirName,
        port = opts.port || 3000,
        packaging = false,
        errors = strings.errors.cli;

    var packageComponents = function(componentsDirs, callback){
      if(!packaging){
        packaging = true;
        logger.log('Packaging components...'.yellow);
        giveMe.all(local.package, _.map(componentsDirs, function(dir){
          return [dir];
        }), function(callbacks){
          logger.log('complete'.green);
          if(typeof(callback) === 'function'){
            callback();
          }

          packaging = false;
        });
      }
    };

    logger.log('Looking for components...'.yellow);

    local.getComponentsByDir(componentsDir, function(err, components){

      if(err){
        return logger.log(err.red);
      }

      if(components.length === 0){
        return logger.log(format(errors.DEV_FAIL, errors.COMPONENTS_NOT_FOUND).red);
      }

      packageComponents(components, function(){
        var conf = {
          local: true,
          path: path.resolve(componentsDir),
          port: port,
          baseUrl: format('http://localhost:{0}/', port),
          env: {
            name: 'local'
          }
        };

        logger.log('Starting dev registry on localhost:' + port);

        var dependencies = {};

        _.forEach(local.getLocalNpmModules(componentsDir), function(npmModule){
          dependencies[npmModule] = require(path.resolve('node_modules/', npmModule));
        });

        var registry = new oc.Registry(_.extend(conf, { dependencies: dependencies }));

        registry.start(function(err, app){

          if(err){
            if(err.code === 'EADDRINUSE'){
              return logger.log(format('The port {0} is already in use. Specify the optional port parameter to use another port.', port).red);
            } else {
              logger.log(err.red);
            }
          }

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
        });
      });
    });
  };
};