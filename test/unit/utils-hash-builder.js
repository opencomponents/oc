'use strict';

const expect = require('chai').expect;

describe('utils : hash-builder', function(){

  const hashBuilder = require('../../src/utils/hash-builder');

  it('should build an hash from a string', function(){
    const hash = hashBuilder.fromString('<div>this is a component</div>');

    expect(hash).to.equal('202b43043e85b940e82ebc2dbc24675a1ad3ff06');
  });
});