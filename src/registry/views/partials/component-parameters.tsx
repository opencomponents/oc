import type { OcParameter } from '../../../types';

const componentParameters = ({
  parameters
}: {
  parameters?: Record<string, OcParameter>;
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
    return (
      <div class="row">
        <div class="parameter">
          <span class="bold">{paramName}</span>
          <span>
            ({param.type}, {mandatory})
          </span>
        </div>
        <div class="parameter-description">
          {param.description && (
            <>
              <span>{param.description}</span>
              <br />
              <br />
            </>
          )}
          <span class="bold">Example:</span>
          <span>{param.example}</span>
          {!param.mandatory && param.default && (
            <>
              <br />
              <br />
              <span class="bold">Default:</span>
              <span>{param.default}</span>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <h3>Parameters</h3>
      <div id="plugins" class="table">
        <div class="row header">
          <div class="parameter">Parameters</div>
          <div class="parameter-description" />
        </div>
        {Object.keys(parameters).map((parameterName) =>
          parameterRow(parameters[parameterName], parameterName)
        )}
      </div>
    </div>
  );
};

export default componentParameters;
