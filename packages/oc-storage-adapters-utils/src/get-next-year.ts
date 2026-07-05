export function getNextYear() {
  return new Date(new Date().setFullYear(new Date().getFullYear() + 1));
}
