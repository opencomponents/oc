import type { VM } from '../../../types';

type ComponentHistory = VM['componentsHistory'];
type ComponentHistoryItem = Exclude<ComponentHistory, undefined>[number];

const ComponentsHistory = (props: { componentsHistory: ComponentHistory }) => {
  const componentRow = ({
    name,
    publishDate,
    version,
    templateSize
  }: ComponentHistoryItem) => (
    <a href={`${name}/${version}/~info`}>
      <div class="componentRow row table">
        <p class="release">
          {publishDate} - Published {name}@{version}
          {templateSize ? ` [${Math.round(templateSize / 1024)} kb]` : ''}
        </p>
      </div>
    </a>
  );

  return (
    <div id="components-history" class="box">
      {props.componentsHistory ? props.componentsHistory.map(componentRow) : ''}
    </div>
  );
};

export default ComponentsHistory;
