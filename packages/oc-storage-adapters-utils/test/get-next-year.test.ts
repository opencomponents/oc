/* eslint-disable @typescript-eslint/no-explicit-any */
import { getNextYear } from '../src/get-next-year';

const DATE_TO_USE = new Date('2017');
const _Date = Date;
global.Date = jest.fn(() => DATE_TO_USE) as any;
global.Date.UTC = _Date.UTC;
global.Date.parse = _Date.parse;
global.Date.now = _Date.now;

test('Get next year', () => {
  expect(getNextYear()).toMatchSnapshot();
});
