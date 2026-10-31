const Property = (props: {
  display: string;
  value?: Date | string | number;
  linked?: boolean;
}) => {
  if (!props.value) return null;

  const label = props.linked ? (
    <a safe href={String(props.value)}>
      {String(props.value)}
    </a>
  ) : (
    <span safe>{String(props.value)}</span>
  );

  return (
    <div class="field">
      <p safe>{props.display}:</p> {label}
    </div>
  );
};

export default Property;
