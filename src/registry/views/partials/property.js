module.exports = () => (display, value, linked) => {
  if (!value) return '';

  const label = linked
    ? `<a href="${value}">${value}</a>`
    : `<span>${value}</span>`;

  return `<div class="field"><p>${display}:</p> ${label}</div>`;
};
