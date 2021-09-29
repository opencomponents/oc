const property = () => (
  display: string,
  value?: Date | string | number,
  linked?: boolean
): string => {
  if (!value) return '';

  const label = linked
    ? `<a href="${value}">${value}</a>`
    : `<span>${value}</span>`;

  return `<div class="field"><p>${display}:</p> ${label}</div>`;
};

export default property;
