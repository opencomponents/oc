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

### registry.start(callback)

Starts the registry.

### Registry options

Required parameters:

* `baseUrl`: `string`, it will be used to compose the components' urls

Optional parameters:

* `cache`: `object`, default sets the configuration for the library cache.
  * `verbosity`: `string`, sets the cache's verbosity
  * `refreshInterval`: `number`, the number of seconds before each cached value is refreshed from the library
* `port`: `number`, default `3000`, sets the port where to start the registry
* `tempDir`: `string`, default './temp/', the directory where the components' packages are temporarily stored during the publishing phase
* `verbosity`: `number`, default `0`, sets the `console.log` verbosity during the execution
