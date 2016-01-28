oc-client
=========

Node.js client for [OpenComponents](https://github.com/opentable/oc)

[![NPM](https://nodei.co/npm/oc-client.png?downloads=true)](https://npmjs.org/package/oc-client)

Node.js version: **0.10.0** required

Build status: Linux: [![Build Status](https://secure.travis-ci.org/opentable/oc.png?branch=master)](http://travis-ci.org/opentable/oc) | Windows: [![Build status](https://ci.appveyor.com/api/projects/status/8cklgw4hymutqrsg?svg=true)](https://ci.appveyor.com/project/matteofigus/oc)


Disclaimer: This project is still under heavy development and the API is likely to change at any time. In case you would find any issues, check the [troubleshooting page](../CONTRIBUTING.md#troubleshooting).

# API

### new Client(options)

It will create an instance of the client. Options:

|Parameter|type|mandatory|description|
|---------|----|---------|-----------|
|`cache`|`object`|no|Cache options. If null or empty will use default settings (never flush the cache)|
|`cache.flushInterval`|`number` (seconds)|no|The interval for flushing the cache|
|`components`|`object`|yes|The components to consume with versions|
|`components[name]`|`string`|yes|The component version|
|`registries`|`object`|yes|The registries' endpoints|
|`registries.serverRendering`|`string`|no|The baseUrl for server-side rendering requests|
|`registries.clientRendering`|`string`|no|The baseUrl for client-side rendering requests|

Example:

```js
var Client = require('oc-client');

var client = new Client({
  registries: ['https://myregistry.com/'],
  components: {
    hello: '1.2.3',
    world: '~2.2.5',
    bla: ''
  }
});

```

### Client#renderComponent(componentName [, options], callback)

It will resolve a component href, will make a request to the registry, and will render the component. The callback will contain an error (if present) and rendered html.

Options:

|Parameter|type|mandatory|description|
|---------|----|---------|-----------|
|`container`|`boolean`|no|Default true, when false, renders a component without its <oc-component> container|
|`disableFailoverRendering`|`boolean`|no|Disables the automatic failover rendering in case the registry times-out (in case configuration.registries.clientRendering contains a valid value.) Default false|
|`headers`|`object`|no|An object containing all the headers that must be forwarded to the component|
|`ie8`|`boolean`|no|Default false, if true puts in place the necessary polyfills to make all the stuff work with ie8|
|`params`|`object`|no|An object containing the parameters for component's request|
|`render`|`string`|no|Default `server`. When `client` will produce the html to put in the page for post-poning the rendering to the browser|
|`timeout`|`number` (seconds)|no|Default 5. When request times-out, the callback will be fired with a timeout error and a client-side rendering response (unless `disableFailoverRendering` is set to `true`)|

Example:
```js
...
client.renderComponent('header', {
  container: false,
  headers: {
    'accept-language': 'en-GB'
  },
  params: {
    loggedIn: true
  },
  timeout: 2
}, function(err, html){
  console.log(html);
  // => "<div>This is the header. <a>Log-out</a></div>"
});
```
