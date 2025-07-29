const Property = (props: {
  display: string;
  value?: Date | string | number;
  linked?: boolean;
}) => {
  if (!props.value) return null;

  const label = props.linked ? (
    <a href={String(props.value)}>{String(props.value)}</a>
  ) : (
    <span>{String(props.value)}</span>
  );

  return (
    <div class="field">
      <p>{props.display}:</p> {label}
    </div>
  );
};

export default Property;
