const assert = require('node:assert/strict');
const { test } = require('node:test');
const { getNextYear } = require('../dist');

test('Get next year', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2017') });

  assert.equal(getNextYear().toISOString(), '2018-01-01T00:00:00.000Z');
});
