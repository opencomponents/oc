import type { VM } from '../../../types';

type AvailableDependencies = VM['availableDependencies'];
type AvailableDependency = AvailableDependencies[number];

const ComponentsDependencies = (props: {
  availableDependencies: AvailableDependencies;
}) => {
  const dependencyRow = ({
    core,
    link,
    name,
    version
  }: AvailableDependency) => {
    const label = name + (core ? ' (node.js core dependency)' : `@${version}`);
    return (
      <a href={link} target="_blank" rel="noreferrer">
        <div class="componentRow row table">
          <p safe class="release">
            {label}
          </p>
        </div>
      </a>
    );
  };

  return (
    <div id="components-dependencies" class="box">
      {props.availableDependencies.length ? (
        props.availableDependencies.map(dependencyRow)
      ) : (
        <div class="empty-state">No dependencies registered</div>
      )}
    </div>
  );
};

export default ComponentsDependencies;
