import type { RegistryEvents as Events } from '@oc-framework/core';
import { strings } from '@oc-framework/core';

export type { RegistryRequestData as RequestData } from '@oc-framework/core';

type Subscription<T = any> = (data: T) => void;
let subscriptions: Record<string, Array<Subscription>> = {};

type EventsHandler = {
  fire<T extends keyof Events>(eventName: T, data: Events[T]): void;
  hasListeners<T extends keyof Events>(eventName: T): boolean;
  on<T extends keyof Events>(
    eventName: T,
    listener: Subscription<Events[T]>
  ): void;
  off<T extends keyof Events>(
    eventName: T,
    listener: Subscription<Events[T]>
  ): void;
  reset(): void;
};

const eventsHandler: EventsHandler = {
  fire(eventName: string, eventData: unknown): void {
    if (subscriptions[eventName]) {
      for (const callback of subscriptions[eventName]) {
        callback(eventData);
      }
    }
  },

  hasListeners(eventName: string): boolean {
    return Boolean(subscriptions[eventName]?.length);
  },

  on(eventName: string, callback: Subscription): void {
    if (typeof callback !== 'function') {
      throw strings.errors.registry.CONFIGURATION_ONREQUEST_MUST_BE_FUNCTION;
    }

    if (!subscriptions[eventName]) {
      subscriptions[eventName] = [];
    }

    subscriptions[eventName].push(callback);
  },

  off(eventName: string, callback: Subscription): void {
    if (typeof callback !== 'function') {
      throw strings.errors.registry.CONFIGURATION_OFFREQUEST_MUST_BE_FUNCTION;
    }

    if (subscriptions[eventName]) {
      subscriptions[eventName] = subscriptions[eventName].filter(
        (sub) => sub !== callback
      );
    }
  },

  reset(): void {
    subscriptions = {};
  }
};

export default eventsHandler;
