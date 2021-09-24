'use strict';

export default function padZero(length: number, data: number) {
  return Array(length - String(data).length + 1).join('0') + data;
}
