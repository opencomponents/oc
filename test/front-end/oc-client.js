'use strict';

describe('oc-client plugin', function(){
  describe('when loaded', function(){
    it('should expose the oc namespace', function(){
      expect(window.oc).toEqual(jasmine.any(Object));
    });
  });
});