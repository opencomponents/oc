import type { VM } from '../../../types';

type Templates = VM['templates'];
type Template = Templates[number];

const ComponentsTemplates = (props: { templates: Templates }) => {
  const externalLink = ({
    global,
    url
  }: {
    global: string | string[];
    url: string;
  }) => (
    <a safe href={url} target="_blank" rel="noreferrer">
      {global}
    </a>
  );

  const templateRow = ({ externals, type, version }: Template) => {
    const externalLinks = externals.map(externalLink);
    const externalsLabel = externalLinks.length ? (
      <> (Externals: {externalLinks}) </>
    ) : null;

    return (
      <div class="componentRow row table">
        <p class="release">
          <a
            href={`https://www.npmjs.com/package/${type}`}
            target="_blank"
            rel="noreferrer"
            safe
          >
            {type}@{version}
          </a>
          {externalsLabel}
        </p>
      </div>
    );
  };

  return (
    <div id="components-templates" class="box">
      {props.templates.map(templateRow)}
    </div>
  );
};

export default ComponentsTemplates;
