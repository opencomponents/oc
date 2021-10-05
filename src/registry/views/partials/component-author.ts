const componentAuthor = (vm: {
  parsedAuthor: {
    name?: string;
    email?: string;
    url?: string;
  };
}) => (): string => {
  const author = vm.parsedAuthor;
  let placeholder = '';

  if (!author.name && !author.email && !author.url) {
    placeholder += `<span>not available</span>`;
  }

  if (author.name) {
    placeholder += `<span>${author.name}&nbsp;</span>`;
  }

  if (author.email) {
    placeholder += `<span><a href="mailto:${author.email}">${author.email}</a>&nbsp;</span>`;
  }

  if (author.url) {
    placeholder += `<span><a href="${author.url}" target="_blank">${author.url}</a></span>`;
  }

  return `<div class="field"><p>Author:</p>${placeholder}</div>`;
};

export default componentAuthor;
