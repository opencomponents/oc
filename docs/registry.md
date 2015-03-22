# Registry configuration

1. [Introduction](#introduction)
1. [Setup](#setup)
1. [API](#api)

## Introduction

The registry is a REST api that serves the components. You can have multiple registries connected to a library, but you can't have multiple libraries connected to a registry.

## Setup

First, create a dir and install oc:
```sh
mkdir oc-registry && cd oc-registry
npm init
npm install oc --save
touch index.js
```

This is the `index.js` content:
```js
var oc = require('oc');

var configuration = {
  verbosity: 0,
  baseUrl: 'https://my-components-registry.mydomain.com/',
  port: 3000,
  tempDir: './temp/',
  refreshInterval: 600,
  pollingInterval: 5,
  s3: {
    key: 'your-s3-key',
    secret: 'your-s3-secret',
    bucket: 'your-s3-bucket',
    region: 'your-s3-region',
    path: '//s3.amazonaws.com/your-s3-bucket/',
    componentsDir: 'components'
  },
  env: { name: 'production' }
};

var registry = new oc.Registry(configuration);

registry.start(function(err, app){
  if(err){
    console.log('Registry not started: ', err);
    process.exit(1);
  }
});
```

## API

### var registry = new oc.Registry(configuration);
Creates an instance of the registry. [Configuration](#registry-configuration) is an object that contains the registry configuration parameters.

### registry.start(callback)

Starts the registry.

### registry.on(eventName, callback);

Regulates [events subscriptions](#registry-events).

### Registry configuration

Required parameters:

|Parameter|Type|Description|
|-|-|-|
|`baseUrl`|`string`|sets the URL which will be used to compose the components' URLs|
|`dependencies`|`object`|sets the dependencies available for components logic, for example: `{ underscore: require('underscore'), request: require('request') }`|
|`env`|`object`|sets the registry environment|
|`env.name`|`string`|sets the environment name|
|`pollingInterval`|`number` (seconds)|When the components' list cache will be refreshed. This is required for distributing the components on each registry instance. Given the polling mechanism is quite efficient, this number should be very low. Suggested is around 5-10 seconds.|
|`port`|`number`|default `3000`, sets the port where to start the registry|
|`prefix`|`string`|sets the href prefix, for example: `/v2/`|
|`publishAuth`|`object`|sets the authentication parameters for publishing a component to the registry. When `undefined`, no authorisation is required.
|`publishAuth.type`|`string`|The authorisation type. Only `basic` is supported at the moment.|
|`publishAuth.username`|`string`|sets the user name|
|`publishAuth.password`|`string`|sets the user password|
|`refreshInterval`|`number` (seconds)|When the components' data cache will be refreshed. Given the data is immutable, this should be high and just for robustness.|
|`routes`|`array of objects`|sets additional actions via URL mapping to specific action handlers|
|`routes[index].route`|`string`|sets URL pattern|
|`routes[index].method`|`string`|sets verb|
|`routes[index].handler`|`function`|sets function handler for routed action [Look at the example](#routes-example)|
|`s3`|`object`|sets the Amazon S3 credentials|
|`s3.key`|`string`|sets S3 access key|
|`s3.secret`|`string`|sets S3 secret
|`s3.bucket`|`string`|sets S3 bucket
|`s3.region`|`string`|sets S3 region
|`s3.path`|`string`|sets path for the static resources. Can be the s3 url, or, when using cloudfront, it can be `//cloudfront-id.cloudfront.net/`.
|`s3.componentsDir`|`string`|the path where the data will be saved inside the bucket|
|`tempDir`|`string`|default `./temp/`, sets the directory where the components' packages are temporarily stored during the publishing phase inside the registry box|
|`verbosity`|`number`|default `0`, sets the `console.log` verbosity during the execution|

#### Routes example
```js
options.routes = [{
  route: '/example-route',
  method: 'get',
  handler: function(req, res){
    // Handling function content
  }
}];
```

### Registry events

|Event name|CallbackDataType|Description|
|-|-|-|
|`cache-poll`|`object`|Fired when the components list is refreshed. The callback data contains the last edit unix utc timestamp.|
|`request`|`object`|Fired every time the registry receives a request. The callback data contains some request and response details.|
|`start`|`undefined`|Fired when the registry starts|
