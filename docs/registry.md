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

var options = {
  verbosity: 0,
  baseUrl: 'https://my-components-registry.mydomain.com/',
  port: 3000,
  tempDir: './temp/',
  cache: { verbose: false, refreshInterval: 600 },
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

var registry = new oc.Registry(options);

if(registry.err){
  return console.log(registry.err);
}

registry.start(function(err, app){
  // Registry started!
});
```

## API

### var registry = new oc.Registry(options);
Creates an instance of the registry. [Options](#registry-options) is an object that contains the registry configuration parameters.

### registry.err
Stores the error information in case of unsuccessful attempt to create an instance of the registry.

### registry.start(callback)

Starts the registry.

### Registry options

Required parameters:

* `baseUrl`: `string`, sets the URL which will be used to compose the components' URLs

Optional parameters:

* `cache`: `object`, default sets the configuration for the library cache.
  * `verbosity`: `string`, sets the cache's verbosity
  * `refreshInterval`: `number`, sets the number of seconds before each cached value is refreshed from the library
* `dependencies`: `object`, sets the additional library requirements, e.g.:
```js
options.dependencies = {
    underscore: require('underscore'),
    request: require('request')
};
```
* `env`: `object`, sets the registry environment
  * `name`: `string`, sets the environment name
* `onRequest`: `function`, sets the callback function which is called every time the API is called. The argument data stores all the request information, e.g:
```js
options.onRequest = function(data){
  console.log(data.method);
}
```
* `port`: `number`, default `3000`, sets the port where to start the registry
* `prefix`: `string`, ??
* `publishAuth`: `object`, sets the authentication type when publishing a component to the registry
  * `type`: `string`, sets the authentication type
  * `username`: `string`, sets the user name
  * `password`: `string`, sets the user password

  ```js
options.publishAuth = {
  type: 'exampleType',
  username: 'exampleUsername'
  password: 'examplePassword'
}
```
* `routes`: `array of objects`, sets additional actions via URL mapping to specific action handlers
  * `route`: `string`, sets URL pattern
  * `method`: `string`, sets method type
  * `handler`: `function`, sets function handler for routed action

  ```js
options.routes = [{
  route: '/example-route',
  method: 'get',
  handler: function(req, res){
    // Handling function content
  }
}];
```
* `s3`: `object`, sets the Amazon S3 credentials
  * `key`: `string`, sets S3 access key
  * `secret`: `string`, sets S3 secret
  * `bucket`: `string`, sets S3 bucket
  * `region`: `string`, sets S3 region
  * `path`: `string`, sets path to the S3 bucket
  * `componentsDir`: `string`, sets the name of components directory
* `tempDir`: `string`, default `./temp/`, sets the directory where the components' packages are temporarily stored during the publishing phase
* `verbosity`: `number`, default `0`, sets the `console.log` verbosity during the execution
