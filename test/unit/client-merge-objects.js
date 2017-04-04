'use strict';

const expect = require('chai').expect;
const mergeObjects = require('../../client/src/utils/merge-objects');

describe('client : merge-objects :', () => {
  const scenarios = [
    { describe: 'obj1 is empty and obj2 is empty', obj1: {}, obj2: {}, obj3: {} },
    { describe: 'obj1 is not empty and obj2 is empty', obj1: { p1: 'aaa' }, obj2: {}, obj3: { p1: 'aaa' } },
    { describe: 'obj1 is empty and obj2 is not empty', obj1: {}, obj2: { p2: 'bbb' }, obj3: { p2: 'bbb' } },
    { describe: 'obj1 is not empty and obj2 is not empty', obj1: { p1: 'aaa' }, obj2: { p2: 'bbb' }, obj3: { p1: 'aaa', p2: 'bbb' } },
    { describe: 'obj1 is undefined and obj2 is undefined', obj1: undefined, obj2: undefined, obj3: {} },
    { describe: 'obj1 is null and obj2 is null', obj1: null, obj2: null, obj3: {} },
    { describe: 'obj1 and obj2 have a property in common', obj1: { a: 1, b: 2 }, obj2: { b: 3, c: 4 }, obj3: { a: 1, b: 2, c: 4 } }
  ];

  scenarios.forEach((scenario) => {
    describe(`when ${scenario.describe}`, () => {
      it(`then obj3 is equal to ${JSON.stringify(scenario.obj3)}`, () => {
        expect(mergeObjects(scenario.obj1, scenario.obj2)).to.deep.equal(scenario.obj3);
      });
    });
  });
});
