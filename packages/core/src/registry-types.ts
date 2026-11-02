import type http from 'node:http';
import type { IncomingHttpHeaders } from 'node:http';
import type { HttpServerAdapterFactory, NativeApp } from './http-server-types';
import type { Component, Plugin, RegistryErrorEvent } from './types';

export interface RegistryRequestData {
  body: unknown;
  duration: number;
  headers: IncomingHttpHeaders;
  method: string;
  path: string;
  relativeUrl: string;
  query: Record<string, unknown>;
  url: string;
  statusCode: number;
  errorDetails?: string;
  errorCode?: string;
}

export interface RegistryEvents {
  error: RegistryErrorEvent;
  start: unknown;
  'cache-poll': number;
  request: RegistryRequestData;
  'component-retrieved': {
    headers: IncomingHttpHeaders;
    name: string;
    parameters: IncomingHttpHeaders;
    requestVersion: string;
    duration: number;
  };
  'data-provider-error': {
    name: string;
    version: string;
    parameters: Record<string, string | boolean | number>;
    requestVersion: string;
    status: number;
    error: Error;
  };
  'component-published': {
    componentName: string;
    componentVersion: string;
    packageJson: Component;
    componentFolder: string;
    user?: string;
  };
}

export interface RegistryType<TApp = NativeApp<HttpServerAdapterFactory>> {
  close(): Promise<void>;
  close(callback: (err?: Error | string) => void): Promise<void>;
  on<T extends keyof RegistryEvents>(
    eventName: T,
    listener: (data: RegistryEvents[T]) => void
  ): void;
  register<T = any>(plugin: Plugin<T>): Promise<void>;
  register<T = any>(
    plugin: Plugin<T>,
    callback?: (...args: any[]) => void
  ): Promise<void>;
  start(): Promise<{ app: TApp; server: http.Server }>;
  start(
    callback: (err: unknown, data?: { app: TApp; server: http.Server }) => void
  ): Promise<{ app: TApp; server: http.Server }>;
  app: TApp;
}
