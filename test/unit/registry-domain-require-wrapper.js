'use strict';

var expect = require('chai').expect;
var vm = require('vm');

describe('registry : domain : require-wrapper', function(){

  var RequireWrapper = require(__BASE + '/registry/domain/require-wrapper');

  describe('when using the require wrapper in a clear context', function(){

    describe('when injecting a dependency', function(){

      var dependencies = {
        'some-module': {
          someFunction: function(name){
            return 'hello ' + name;
          }
        }
      };

      var context = {
        require: new RequireWrapper(dependencies),
        result: null
      };

      var script = 'var someModule = require(\'some-module\');\n' +
                   'result = someModule.someFunction(\'John Doe\');';

      vm.runInNewContext(script, context);

      it('should correctly make the dependency require-able', function(){
        expect(context.result).to.eql('hello John Doe');
      });
    });

    describe('when requiring un-injected dependency', function(){

      var dependencies = {};

      var context = {
        require: new RequireWrapper(dependencies),
        result: null
      };

      var script = 'var someModule = require(\'some-module\');\n' +
                   'result = someModule.someFunction(\'John Doe\');';

      it('should correctly throw an error', function(){
        expect(function(){
          return vm.runInNewContext(script, context);
        }).to.throw({
          code: 'DEPENDENCY_MISSING_FROM_REGISTRY',
          missing: ['someModule']
        });
      });
    });
  });
});
