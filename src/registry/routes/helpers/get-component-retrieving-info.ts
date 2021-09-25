interface Options {
  headers: Dictionary<string>;
  name: string;
  parameters: Dictionary<string>;
  version: string;
}

export default function getComponentRetrievingInfo(options: Options) {
  let eventData = {
    headers: options.headers,
    name: options.name,
    parameters: options.parameters,
    requestVersion: options.version || '',
    duration: 0
  };

  const start = process.hrtime();

  return {
    extend(obj: Dictionary<string>) {
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
