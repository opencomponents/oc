'use strict';

var expect = require('chai').expect;

describe('utils : format', function(){

  var format = require('../../utils/format');

  it('should format a simple string', function(){
    var formatted = format('hello {0}', 'world');
    expect(formatted).to.equal('hello world');
  });

  it('should format a long string with multiple parameters', function(){
    var dante = 'Nel {0} del {2} di {1}',
        formatted = format(dante, 'mezzo', 'nostra vita', 'cammin');

    expect(formatted).to.equal('Nel mezzo del cammin di nostra vita');
  });

  it('should format a long string with repeating parameters', function(){
    var barbie = 'I\'m a {0} {1} in a {0} world',
        formatted = format(barbie, 'Barbie', 'girl');

    expect(formatted).to.equal('I\'m a Barbie girl in a Barbie world');
  });
});