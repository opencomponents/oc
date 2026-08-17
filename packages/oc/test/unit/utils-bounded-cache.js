const expect = require('chai').expect;

const BoundedCache = require('../../dist/utils/bounded-cache').default;

describe('utils : bounded cache', () => {
  it('rejects invalid capacities', () => {
    for (const capacity of [0, -1, 1.5, Number.NaN]) {
      expect(() => new BoundedCache(capacity)).to.throw(
        'Cache capacity must be a positive integer'
      );
    }
  });

  it('evicts the least-recently used entry at capacities one and two', () => {
    const one = new BoundedCache(1);
    one.set('files', 'a', 'a');
    one.set('files', 'b', 'b');
    expect(one.get('files', 'a')).to.equal(undefined);
    expect(one.get('files', 'b')).to.equal('b');

    const two = new BoundedCache(2);
    two.set('files', 'a', 'a');
    two.set('files', 'b', 'b');
    expect(two.get('files', 'a')).to.equal('a');
    two.set('files', 'c', 'c');
    expect(two.get('files', 'b')).to.equal(undefined);
    expect(two.get('files', 'a')).to.equal('a');
    expect(two.get('files', 'c')).to.equal('c');
  });

  it('promotes updates without growing the cache', () => {
    const cache = new BoundedCache(2);
    cache.set('files', 'a', 'a');
    cache.set('files', 'b', 'b');
    cache.set('files', 'a', 0);
    expect(cache.size).to.equal(2);

    cache.set('files', 'c', 'c');
    expect(cache.get('files', 'a')).to.equal(0);
    expect(cache.get('files', 'b')).to.equal(undefined);
  });

  it('keeps namespaces distinct and deletes exactly one entry', () => {
    const cache = new BoundedCache(3);
    cache.set('one', 'shared', 'one');
    cache.set('two', 'shared', 'two');
    cache.set('one:shared', 'two', 'three');

    expect(cache.delete('one', 'shared')).to.equal(true);
    expect(cache.delete('one', 'shared')).to.equal(false);
    expect(cache.get('two', 'shared')).to.equal('two');
    expect(cache.get('one:shared', 'two')).to.equal('three');
    expect(cache.size).to.equal(2);
  });

  it('stores falsy values and empty objects', () => {
    const cache = new BoundedCache(4);
    const empty = {};
    cache.set('values', 'false', false);
    cache.set('values', 'zero', 0);
    cache.set('values', 'string', '');
    cache.set('values', 'object', empty);

    expect(cache.get('values', 'false')).to.equal(false);
    expect(cache.get('values', 'zero')).to.equal(0);
    expect(cache.get('values', 'string')).to.equal('');
    expect(cache.get('values', 'object')).to.equal(empty);
  });

  it('fills and clears one instance without changing another', () => {
    const first = new BoundedCache(2);
    const second = new BoundedCache(2);
    second.set('files', 'a', 'second');
    first.set('files', 'a', 'a');
    first.set('files', 'b', 'b');
    first.set('files', 'c', 'c');

    expect(first.size).to.equal(2);
    expect(second.size).to.equal(1);
    expect(second.get('files', 'a')).to.equal('second');

    first.clear();
    expect(first.size).to.equal(0);
    expect(second.size).to.equal(1);
    expect(second.get('files', 'a')).to.equal('second');
  });

  it('bounds 1001 entries at 1000 and evicts the true LRU entry', () => {
    const cache = new BoundedCache(1000);
    for (let index = 0; index < 1000; index++) {
      cache.set('artifacts', String(index), index);
    }
    expect(cache.get('artifacts', '0')).to.equal(0);

    cache.set('artifacts', '1000', 1000);
    expect(cache.size).to.equal(1000);
    expect(cache.get('artifacts', '0')).to.equal(0);
    expect(cache.get('artifacts', '1')).to.equal(undefined);
    expect(cache.get('artifacts', '1000')).to.equal(1000);
  });
});
