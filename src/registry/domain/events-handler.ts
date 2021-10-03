import strings from '../../resources';

type Subscription<T = any> = (data: T) => void;
let subscriptions: Record<string, Array<Subscription>> = {};

export function fire(eventName: string, eventData: unknown): void {
  if (subscriptions[eventName]) {
    subscriptions[eventName].forEach(callback => {
      callback(eventData);
    });
  }
}

export function on(eventName: string, callback: Subscription): void {
  if (typeof callback !== 'function') {
    throw strings.errors.registry.CONFIGURATION_ONREQUEST_MUST_BE_FUNCTION;
  }

  if (!subscriptions[eventName]) {
    subscriptions[eventName] = [];
  }

  subscriptions[eventName].push(callback);
}

export function off(eventName: string, callback: Subscription): void {
  if (typeof callback !== 'function') {
    throw strings.errors.registry.CONFIGURATION_OFFREQUEST_MUST_BE_FUNCTION;
  }

  if (subscriptions[eventName]) {
    subscriptions[eventName] = subscriptions[eventName].filter(
      sub => sub !== callback
    );
  }
}

export function reset(): void {
  subscriptions = {};
}
