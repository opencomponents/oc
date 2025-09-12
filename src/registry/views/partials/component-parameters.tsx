import type { OcParameter } from '../../../types';

const componentParameters = ({
  parameters,
  currentValues
}: {
  parameters?: Record<string, OcParameter>;
  currentValues?: Record<string, string>;
}) => {
  if (!parameters || Object.keys(parameters).length === 0) {
    return (
      <section class="content-section">
        <div class="section-header">
          <div class="section-icon">⚙️</div>
          <h2 class="section-title">Parameters</h2>
        </div>
        <div class="section-content">
          <p class="w-100">This component has no parameters</p>
        </div>
      </section>
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
              placeholder={String(param.example) || ''}
            />
          );
        case 'boolean': {
          const isChecked = String(currentValue) === 'true';
          return (
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input
                type="checkbox"
                name={paramName}
                data-parameter={paramName}
                checked={isChecked}
                style="margin: 0;"
              />
              <span safe>Enable {paramName}</span>
            </label>
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
                  : String(param.example) || ''
              }
            />
          );
      }
    };

    return (
      <div class="parameter-item">
        <div class="parameter-header">
          <span class="parameter-name" safe>
            {paramName}
          </span>
          <span
            class={`parameter-type ${
              mandatory === 'mandatory' ? 'parameter-required' : ''
            }`}
          >
            {param.type}, {mandatory}
          </span>
        </div>
        {!!param.description && (
          <p class="parameter-description" safe>
            {param.description}
          </p>
        )}
        {param.type !== 'boolean' && !!param.example && (
          <p class="parameter-description">
            <strong>Example:</strong> {param.example}
          </p>
        )}
        {!param.mandatory && !!param.default && (
          <p class="parameter-description">
            <strong>Default:</strong> <span safe>{String(param.default)}</span>
          </p>
        )}
        {renderInput()}
      </div>
    );
  };

  return (
    <section class="content-section collapsible-section">
      <div
        class="section-header collapsible-header"
        data-target="parameters-content"
      >
        <div class="section-icon">⚙️</div>
        <h2 class="section-title">Parameters</h2>
        <button
          type="button"
          class="collapse-toggle"
          aria-label="Toggle parameters section"
        >
          <span class="collapse-icon">▼</span>
        </button>
      </div>
      <div class="section-content collapsible-content" id="parameters-content">
        <div class="parameter-grid">
          {Object.keys(parameters).map((parameterName) =>
            parameterRow(parameters[parameterName], parameterName)
          )}
        </div>
      </div>
    </section>
  );
};

export default componentParameters;
