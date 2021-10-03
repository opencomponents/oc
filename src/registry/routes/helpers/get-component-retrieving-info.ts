import { IncomingHttpHeaders } from 'http';

interface Options {
  headers: IncomingHttpHeaders;
  name: string;
  parameters: IncomingHttpHeaders;
  version: string;
}

interface EventData {
  headers: IncomingHttpHeaders;
  name: string;
  parameters: IncomingHttpHeaders;
  requestVersion: string;
  duration: number;
}

export default function getComponentRetrievingInfo(
  options: Options
): {
  extend(obj: unknown): void;
  getData(): EventData;
} {
  const eventData: EventData = {
    headers: options.headers,
    name: options.name,
    parameters: options.parameters,
    requestVersion: options.version || '',
    duration: 0
  };

  const start = process.hrtime();

  return {
    extend(obj: unknown) {
      Object.assign(eventData, obj);
    },
    getData() {
      const delta = process.hrtime(start);
      const nanosec = delta[0] * 1e9 + delta[1];
      eventData.duration = nanosec / 1e3;

      return eventData;
    }
  };
}
