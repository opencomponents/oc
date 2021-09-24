import padZero from './pad-zero';

export default function dateStringify(date: unknown): string {
  if (date instanceof Date) {
    return (
      date.getFullYear() +
      '/' +
      padZero(2, date.getMonth() + 1) +
      '/' +
      padZero(2, date.getDate()) +
      ' ' +
      padZero(2, date.getHours()) +
      ':' +
      padZero(2, date.getMinutes()) +
      ':' +
      padZero(2, date.getSeconds())
    );
  }

  return '';
}
