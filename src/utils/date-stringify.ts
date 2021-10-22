function padTwoDigits(data: number): string {
  return String(data).padStart(2, '0');
}

export default function dateStringify(date: unknown): string {
  if (date instanceof Date) {
    return (
      date.getFullYear() +
      '/' +
      padTwoDigits(date.getMonth() + 1) +
      '/' +
      padTwoDigits(date.getDate()) +
      ' ' +
      padTwoDigits(date.getHours()) +
      ':' +
      padTwoDigits(date.getMinutes()) +
      ':' +
      padTwoDigits(date.getSeconds())
    );
  }

  return '';
}
