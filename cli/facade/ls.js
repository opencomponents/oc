'use strict';

var colors = require('colors');
var format = require('stringformat');
var strings = require('../../resources/index');
var Table = require('cli-table');
var _ = require('underscore');

module.exports = function(dependencies){
  
  var registry = dependencies.registry,
      logger = dependencies.logger;

  var printComponents = function (err, components) {

    if(err){
      return logger.log(err.red);
    }

    var rows = [],
        margin = 2,
        namesLength = 0,
        versionsLength = 0,
        urlsLength = 0;
        
    _.forEach(components, function(component){
    
      if(component.name.length > namesLength){
        namesLength = component.name.length;
      }

      if(component.version.length > versionsLength){
        versionsLength = component.version.length;
      }
      
      if(component.href.length > urlsLength){
        urlsLength = component.href.length;
      }

      rows.push([component.name, component.version, component.description, component.href]);
    }, this);

    var table = new Table({ 
      head: ['name', 'version', 'description', 'href'],
      colWidths: [namesLength + margin, versionsLength + margin, (100 - namesLength - urlsLength - versionsLength), urlsLength + margin]
    });

    _.forEach(rows, function(row){
      table.push(row);
    });

    logger.log(table.toString());

  };

  return function(opts){

    opts = opts || {};

    if (!opts.registry) {
      registry.get(function(err, registryLocations){
        if(!registryLocations || registryLocations.length === 0){        
          return logger.log(strings.errors.cli.REGISTRY_NOT_FOUND.red);
        } else {
          logger.log(format(strings.messages.cli.COMPONENTS_LIST, registryLocations[0]).yellow);
          
          registry.getRegistryComponentsByRegistry(registryLocations[0], printComponents);
        } 
      });      
    } else {

      registry.getRegistryComponentsByRegistry(opts.registry, printComponents);
      
    }
  };
};