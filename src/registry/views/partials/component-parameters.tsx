import type { OcParameter } from '../../../types';

const componentParameters = ({
  parameters,
  currentValues
}: {
  parameters?: Record<string, OcParameter>;
  currentValues?: Record<string, string>;
}) => {
  if (!parameters) {
    return (
      <div>
        <h3>Parameters</h3>
        <p class="w-100">none</p>
      </div>
    );
  }

  const parameterRow = (param: OcParameter, paramName: string) => {
    const mandatory = param.mandatory ? 'mandatory' : 'optional';
    const defaultValue =
      param.default !== undefined ? String(param.default) : '';
    const exampleValue =
      param.example !== undefined ? String(param.example) : '';
    const currentValue =
      currentValues?.[paramName] || defaultValue || exampleValue;

    const renderInput = () => {
      switch (param.type) {
        case 'number':
          return (
            <input
              type="number"
              class="parameter-input"
              name={paramName}
              data-parameter={paramName}
              value={currentValue}
              placeholder={param.example || ''}
            />
          );
        case 'boolean': {
          const isChecked = String(currentValue) === 'true';
          return (
            <input
              type="checkbox"
              class="parameter-input"
              name={paramName}
              data-parameter={paramName}
              checked={isChecked}
            />
          );
        }
        default:
          return (
            <input
              type="text"
              class="parameter-input"
              name={paramName}
              data-parameter={paramName}
              value={currentValue}
              placeholder={
                typeof param.default !== 'undefined'
                  ? String(param.default)
                  : param.example || ''
              }
            />
          );
      }
    };

    return (
      <div class="row">
        <div class="parameter">
          <span safe class="bold">
            {paramName}
          </span>
          <span>
            ({param.type}, {mandatory})
          </span>
        </div>
        <div class="parameter-description">
          {!!param.description && (
            <>
              <span safe>{param.description}</span>
              <br />
              <br />
            </>
          )}
          {param.type !== 'boolean' && !!param.example && (
            <>
              <span class="bold">Example:</span>
              <span>{param.example}</span>
              <br />
              <br />
            </>
          )}
          {!param.mandatory && !!param.default && (
            <>
              <span class="bold">Default:</span>
              <span safe>{String(param.default)}</span>
              <br />
              <br />
            </>
          )}
          <span class="bold">
            {param.type === 'boolean' ? 'Enabled:' : 'Value:'}
          </span>
          {renderInput()}
        </div>
      </div>
    );
  };

  return (
    <div>
      <h3>Parameters</h3>
      <div id="plugins" class="table">
        {Object.keys(parameters).map((parameterName) =>
          parameterRow(parameters[parameterName], parameterName)
        )}
      </div>
    </div>
  );
};

export default componentParameters;
