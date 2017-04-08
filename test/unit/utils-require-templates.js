'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var path = require('path');
var _ = require('underscore');

describe('utils : require-template', function(){
  var globals = {
    '__dirname': '.',
  };
  
  var deps = {
    'path': {
      join (a, b, c, template) {
        return path.join(a,b,c,template);
      },
      resolve (a,b,template) {
        var dir = path.join(
          path.resolve(),
          'node_modules/oc-template-handlebars/node_modules',
          template
        );
        return dir;
      }
    }
  };

  var requireTemplate = injectr(
    '../../src/utils/require-template.js', deps, globals
  );

  it('should return the template found if its of the correct type', function(){
    var template = requireTemplate('oc-template-jade');
    var templateAPIs = _.keys(template);
  
    expect(_.contains(templateAPIs,
      'getInfo',
      'getCompiledTemplate',
      'compile',
      'render')
    ).to.be.true;
  });

  it('should throw an error if the template found hasn\'t the right format', function(){
    try {
      requireTemplate('handlebars');
    } catch (e) {
      expect(e).to.equal('Error requiring oc-template: "handlebars" is not a valid oc-template');
    }
  });
});
