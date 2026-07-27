const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

const initialise = () => {
  const emitWarning = sinon.stub();
  const deprecate = injectr(
    '../../dist/utils/deprecate.js',
    {},
    { process: { emitWarning } }
  ).default;

  return { deprecate, emitWarning };
};

describe('utils : deprecate', () => {
  it('emits a DeprecationWarning containing the subject and replacement', () => {
    const { deprecate, emitWarning } = initialise();

    deprecate({
      id: 'some-unique-id',
      subject: 'The `foo` option',
      replacement: '`bar`'
    });

    expect(emitWarning.calledOnce).to.be.true;
    expect(emitWarning.args[0][0]).to.equal(
      'The `foo` option is deprecated and will be removed in OpenComponents v1 - use `bar` instead.'
    );
    expect(emitWarning.args[0][1]).to.equal('DeprecationWarning');
  });

  it('only warns once per process for the same id', () => {
    const { deprecate, emitWarning } = initialise();

    deprecate({ id: 'repeat-id', subject: 'X', replacement: 'Y' });
    deprecate({ id: 'repeat-id', subject: 'X', replacement: 'Y' });
    deprecate({ id: 'repeat-id', subject: 'X', replacement: 'Y' });

    expect(emitWarning.calledOnce).to.be.true;
  });

  it('warns independently for different ids', () => {
    const { deprecate, emitWarning } = initialise();

    deprecate({ id: 'id-a', subject: 'A', replacement: 'B' });
    deprecate({ id: 'id-b', subject: 'C', replacement: 'D' });

    expect(emitWarning.calledTwice).to.be.true;
  });
});
