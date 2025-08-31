const componentAuthor = (props: {
  name?: string;
  email?: string;
  url?: string;
}) => {
  const { name, email, url } = props;
  return (
    <div class="field">
      <p>Author:</p>
      {!name && !email && !url && <span>not available</span>}
      {!!name && <span safe>{name}&nbsp;</span>}
      {email && (
        <span>
          <a href={`mailto:${email}`}>{email}</a>&nbsp;
        </span>
      )}
      {!!url && (
        <span>
          <a safe href={url} target="_blank" rel="noreferrer">
            {url}
          </a>
        </span>
      )}
    </div>
  );
};

export default componentAuthor;
