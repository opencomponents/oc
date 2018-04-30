module.exports = ({ component }) => () => {
  const componentOption = version =>
    `<option value="${version}"${
      version === component.version ? ' selected="selected"' : ''
    }>${version}</option>`;

  return `<select id="versions">${component.allVersions
    .map(componentOption)
    .join('')}</select>`;
};
