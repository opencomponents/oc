'use strict';

var colors = require('colors');
var giveMe = require('give-me');
var strings = require('../../resources/index');
var Table = require('cli-table');
var _ = require('underscore');

module.exports = function(dependencies){
  
  var registry = dependencies.registry,
      local = dependencies.local,
      logger = dependencies.logger;

  return function(){
    local.info(function(err, res){
      if(err){
        return logger.log(err.red);
      } else {
        if(res.registries.length === 0){
          return logger.log(strings.errors.cli.REGISTRY_NOT_FOUND.red);
        }
        if(_.keys(res.components).length === 0){
          return logger.log(strings.errors.cli.COMPONENTS_LINKED_NOT_FOUND.red);
        }
          
        logger.log(strings.messages.cli.COMPONENTS_LINKED_LIST.yellow);

        var componentUrls = _.map(res.components, function(componentVersion, componentName){
          return [res.registries[0] + '/' + componentName + '/' + componentVersion]; 
        });

        giveMe.all(registry.getApiComponentByHref, componentUrls, function(callbacks){

          var rows = [],
              margin = 2,
              namesLength = 0,
              versionsLength = 0,
              urlsLength = 0;
          
          _.forEach(callbacks, function(callback, i){

            var error = callback[0],
                nameColumn,
                versionColumn,
                descriptionColumn,
                urlColumn = componentUrls[i][0];

            if(!!error){
              nameColumn = 'Not available'.red;
              versionColumn = descriptionColumn = '-'.red;
            } else {
              var component = callback[1];

              nameColumn = component.name,
              versionColumn = (component.version === component.requestVersion ? component.version : component.requestVersion + ' => ' + component.version),
              descriptionColumn = component.description;
            }
          
            if(nameColumn.length > namesLength){
              namesLength = nameColumn.length;
            }

            if(versionColumn.length > versionsLength){
              versionsLength = versionColumn.length;
            }
            
            if(urlColumn.length > urlsLength){
              urlsLength = urlColumn.length;
            }

            rows.push([nameColumn, versionColumn, descriptionColumn, urlColumn]);

          }, this);

          var table = new Table({ 
            head: ['name', 'version', 'description', 'href'],
            colWidths: [namesLength + margin, versionsLength + margin, (100 - namesLength - urlsLength - versionsLength), urlsLength + margin]
          });

          _.forEach(rows, function(row){
            table.push(row);
          });

          logger.log(table.toString());
        });
      }
    });
  };
};