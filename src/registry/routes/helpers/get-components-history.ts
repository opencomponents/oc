import type { ComponentsDetails } from '../../../types';
import dateStringified from '../../../utils/date-stringify';

interface UnformmatedComponentHistory {
  name: string;
  version: string;
  publishDate: number;
  templateSize?: number;
}

export interface ComponentHistory {
  name: string;
  version: string;
  publishDate: string;
  templateSize?: number;
}

export default function getComponentsHistory(
  history: ComponentsDetails
): ComponentHistory[] {
  const result: UnformmatedComponentHistory[] = [];

  for (const [name, versions] of Object.entries(history.components)) {
    for (const [version, details] of Object.entries(versions)) {
      result.push({
        name,
        publishDate: details.publishDate,
        templateSize: details.templateSize,
        version
      });
    }
  }

  return result
    .sort((a, b) => b.publishDate - a.publishDate)
    .map((x) => ({
      name: x.name,
      version: x.version,
      templateSize: x.templateSize,
      publishDate: !x.publishDate
        ? 'Unknown'
        : dateStringified(new Date(x.publishDate))
    }));
}
