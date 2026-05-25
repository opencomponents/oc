const ComponentsPlugins = (props: {
  availablePlugins: Record<string, string>;
}) => {
  const pluginRow = ([name, description]: [string, string]) => (
    <div class="componentRow row table">
      <p class="release">
        <span style="font-weight: bold">
          {name}
          {description ? ':' : ''}
        </span>
        {description}
      </p>
    </div>
  );

  const plugins = Object.entries(props.availablePlugins);

  return (
    <div id="components-plugins" class="box">
      {plugins.length ? plugins.map(pluginRow) : 'No plugins registered'}
    </div>
  );
};

export default ComponentsPlugins;
