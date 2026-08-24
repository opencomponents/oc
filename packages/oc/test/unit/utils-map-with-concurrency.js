const expect = require('chai').expect;

const mapWithConcurrency = require('../../dist/utils/map-with-concurrency').default;

describe('utils : map-with-concurrency', () => {
  it('validates concurrency like pLimit', () => {
    for (const bad of [0, -1, 0.5, NaN, null, undefined, '2']) {
      expect(() => mapWithConcurrency([1, 2], bad, async (x) => x)).to.throw(
        'Expected `concurrency` to be a number from 1 and up'
      );
    }
    expect(() => mapWithConcurrency([1], Infinity, async (x) => x)).to.not.throw();
  });

  it('resolves empty input to empty array without invoking worker', async () => {
    let invoked = 0;
    const result = await mapWithConcurrency([], 2, async () => {
      invoked++;
      return 1;
    });
    expect(result).to.eql([]);
    expect(invoked).to.equal(0);
  });

  it('preserves output order with concurrency 2', async () => {
    const items = [1, 2, 3, 4, 5];
    const result = await mapWithConcurrency(items, 2, async (x) => x * 2);
    expect(result).to.eql([2, 4, 6, 8, 10]);
  });

  it('preserves order even when workers resolve out of order', async () => {
    const items = [1, 2, 3, 4];
    const delays = [30, 10, 20, 5];
    const result = await mapWithConcurrency(items, 2, async (x, i) => {
      await new Promise((r) => setTimeout(r, delays[i]));
      return x;
    });
    expect(result).to.eql([1, 2, 3, 4]);
  });

  it('passes index to worker', async () => {
    const items = ['a', 'b', 'c'];
    const indices = [];
    const result = await mapWithConcurrency(items, 2, async (x, i) => {
      indices.push(i);
      return x + String(i);
    });
    expect(result).to.eql(['a0', 'b1', 'c2']);
    // indices may be in order of acquisition, which is 0,1,2 for this case
    expect(indices.sort()).to.eql([0, 1, 2]);
  });

  it('serializes with concurrency 1', async () => {
    const items = [1, 2, 3, 4];
    let active = 0;
    let maxActive = 0;
    const order = [];
    await mapWithConcurrency(items, 1, async (x) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 5));
      order.push(x);
      active--;
      return x;
    });
    expect(maxActive).to.equal(1);
    expect(order).to.eql([1, 2, 3, 4]);
  });

  it('allows concurrency larger than items length', async () => {
    const items = [1, 2, 3];
    let active = 0;
    let maxActive = 0;
    const result = await mapWithConcurrency(items, 10, async (x) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return x;
    });
    expect(result).to.eql([1, 2, 3]);
    expect(maxActive).to.equal(3);
  });

  it('handles 10,000 deferred items without eager admission', async () => {
    const total = 10000;
    const concurrency = 5;
    const items = Array.from({ length: total }, (_, i) => i);

    const deferreds = new Map();
    let active = 0;
    let maxActive = 0;
    let invoked = 0;
    let peakInvokedEarly = 0;

    // Create deferred per index
    for (let i = 0; i < total; i++) {
      let resolve;
      const promise = new Promise((r) => {
        resolve = r;
      });
      deferreds.set(i, { promise, resolve });
    }

    let allDone;
    const allPromise = new Promise((r) => {
      allDone = r;
    });

    const worker = async (item, idx) => {
      invoked++;
      active++;
      maxActive = Math.max(maxActive, active);
      // Capture peak invoked before any resolves
      if (invoked === concurrency) {
        // At this point, no deferred has been resolved yet, so we should have only concurrency invoked
        peakInvokedEarly = invoked;
      }
      await deferreds.get(idx).promise;
      active--;
      return item * 2;
    };

    const mappedPromise = mapWithConcurrency(items, concurrency, worker);

    // Give event loop a tick to allow workers to start (microtask)
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // Only concurrency workers should have been invoked before any resolution
    expect(invoked).to.equal(concurrency);
    expect(peakInvokedEarly).to.equal(concurrency);
    expect(maxActive).to.equal(concurrency);

    // Each resolution should admit exactly one next item
    for (let i = 0; i < total; i++) {
      const before = invoked;
      deferreds.get(i).resolve();
      // Wait microtasks for next worker to claim
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      // After resolving one, at most one new item is admitted (except tail)
      if (i + concurrency < total) {
        // One new item should have been started
        // invoked should have increased by 1, active stays bounded
        expect(invoked).to.equal(before + 1);
        expect(active).to.be.at.most(concurrency);
        expect(maxActive).to.equal(concurrency);
      }
      // Allow worker to store result and loop
      await Promise.resolve();
    }

    const result = await mappedPromise;
    expect(result.length).to.equal(total);
    for (let i = 0; i < total; i++) {
      expect(result[i]).to.equal(i * 2);
    }
    expect(maxActive).to.equal(concurrency);
    expect(invoked).to.equal(total);
    expect(active).to.equal(0);
  });

  it('does not create per-item promises eagerly (admission test)', async () => {
    const total = 20;
    const concurrency = 3;
    const items = Array.from({ length: total }, (_, i) => i);
    let invoked = 0;
    const deferreds = Array.from({ length: total }, () => {
      let resolve;
      const promise = new Promise((r) => (resolve = r));
      return { promise, resolve };
    });

    const worker = async (item, idx) => {
      invoked++;
      await deferreds[idx].promise;
      return item;
    };

    const p = mapWithConcurrency(items, concurrency, worker);
    await Promise.resolve();
    await Promise.resolve();
    expect(invoked).to.equal(concurrency);

    // Resolve in order, each should admit one more
    for (let i = 0; i < total; i++) {
      deferreds[i].resolve();
      await Promise.resolve();
      await Promise.resolve();
    }
    const res = await p;
    expect(res).to.eql(items);
    expect(invoked).to.equal(total);
  });

  it('rejects when worker rejects and stops scheduling new work', async () => {
    const items = [1, 2, 3, 4, 5];
    let invoked = 0;
    const worker = async (x, idx) => {
      invoked++;
      if (idx === 1) {
        throw new Error('boom');
      }
      await new Promise((r) => setTimeout(r, 20));
      return x;
    };

    let caught;
    try {
      await mapWithConcurrency(items, 2, worker);
    } catch (err) {
      caught = err;
    }
    expect(caught).to.be.instanceOf(Error);
    expect(caught.message).to.equal('boom');
    // At concurrency 2, first two items start (0 and 1). Item 1 fails quickly, so at most 2-3 items invoked, not all 5
    // Because we stop scheduling after failure
    expect(invoked).to.be.at.most(3);
  });

  it('ensures no unhandled rejections remain after rejection', async () => {
    const items = [1, 2, 3];
    const worker = async (x, idx) => {
      if (idx === 0) throw new Error('first fails');
      return x;
    };
    let err;
    try {
      await mapWithConcurrency(items, 2, worker);
    } catch (e) {
      err = e;
    }
    expect(err.message).to.equal('first fails');
    // Wait a bit to ensure no unhandledRejection event fires
    await new Promise((r) => setTimeout(r, 20));
  });

  it('uses exactly min(concurrency, items.length) worker loops', async () => {
    const items = [1, 2, 3, 4, 5, 6];
    let concurrentWorkers = 0;
    let maxConcurrentWorkers = 0;
    let active = 0;
    const worker = async (x) => {
      concurrentWorkers++;
      maxConcurrentWorkers = Math.max(maxConcurrentWorkers, concurrentWorkers);
      active++;
      await new Promise((r) => setTimeout(r, 5));
      active--;
      concurrentWorkers--;
      return x;
    };
    await mapWithConcurrency(items, 2, worker);
    expect(maxConcurrentWorkers).to.equal(2);
    expect(active).to.equal(0);
  });
});
