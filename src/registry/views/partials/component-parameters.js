module.exports = ({ component }) => () => {
  let parameters = `<h3>Parameters</h3>`;

  if (!component.oc.parameters) {
    return `${parameters}<p class="w-100">none</p>`;
  }

  const parameterRow = (param, paramName) => {
    const mandatory = param.mandatory ? 'mandatory' : 'optional';
    const description = param.description
      ? `<span>${param.description}</span><br /><br />`
      : '';
    const defaultParam =
      !param.mandatory && param.default
        ? `<br /><br /><span class="bold">Default:</span><span>${
          param.default
        }</span>`
        : '';

    return `<div class="row">
      <div class="parameter">
        <span class="bold">${paramName}</span>
        <span>(${param.type}, ${mandatory})</span>
      </div>
      <div class="parameter-description">
        ${description}
        <span class="bold">Example:</span>
        <span>${param.example}</span>
        ${defaultParam}
      </div>
    </div>`;
  };

  const rows = Object.keys(component.oc.parameters)
    .map(parameterName =>
      parameterRow(component.oc.parameters[parameterName], parameterName)
    )
    .join('');

  parameters += `<div id="plugins" class="table">
    <div class="row header">
      <div class="parameter">Parameters</div>
      <div class="parameter-description"></div>
    </div>  
    ${rows}
  </div>`;

  return parameters;
};
