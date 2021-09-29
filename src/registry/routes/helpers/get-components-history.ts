import { ComponentsDetails } from '../../../types';
import dateStringified from '../../../utils/date-stringify';

interface ComponentHistory {
  name: string;
  publishDate: number;
  version: string;
}

export default function getComponentsHistory(history: ComponentsDetails) {
  const result: ComponentHistory[] = [];

  for (const [name, versions] of Object.entries(history.components)) {
    for (const [version, details] of Object.entries(versions)) {
      result.push({
        name,
        publishDate: details.publishDate,
        version
      });
    }
  }

  return result
    .sort((a, b) => b.publishDate - a.publishDate)
    .map(x => ({
      name: x.name,
      version: x.version,
      publishDate: !x.publishDate
        ? 'Unknown'
        : dateStringified(new Date(x.publishDate))
    }));
}
