const componentVersions = ({
  versions,
  selectedVersion
}: {
  versions: string[];
  selectedVersion: string;
}) => {
  return (
    <select id="versions">
      {versions.map((version) => (
        <option value={version} selected={version === selectedVersion}>
          {version}
        </option>
      ))}
    </select>
  );
};

export default componentVersions;
