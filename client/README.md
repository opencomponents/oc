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
  registries: { serverRendering: 'https://myregistry.com/'},
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
|`parameters`|`object`|no|An object containing the parameters for component's request|
|`render`|`string`|no|Default `server`. When `server`, it will return html. When `client` will produce the html to put in the page for post-poning the rendering to the browser|
|`timeout`|`number` (seconds)|no|Default 5. When request times-out, the callback will be fired with a timeout error and a client-side rendering response (unless `disableFailoverRendering` is set to `true`)|

Example:
```js
...
client.renderComponent('header', {
  container: false,
  headers: {
    'accept-language': 'en-GB'
  },
  parameters: {
    loggedIn: true
  },
  timeout: 2
}, function(err, html){
  console.log(html);
  // => "<div>This is the header. <a>Log-out</a></div>"
});
```

### Client#renderComponents(components [, options], callback)

It will make a request to the registry, and will render the components. The callback will contain an array of errors (array of `null`s in case there aren't any) and an array of rendered html snippets. It will follow the same order of the request. This method will make **1** request to the registry + **n** requests for each component to get the views of components that aren't cached yet. After caching the views, this will make just **1** request to the registry.

Components parameter:

|Parameter|type|mandatory|description|
|---------|----|---------|-----------|
|`components`|`array of objects`|yes|The array of components to retrieve and render|
|`components[index].name`|`name`|yes|The component's name|
|`components[index].version`|`string`|no|The component's version. When not speficied, it will use globally specified one (doing client initialisation); when not specified and not globally specified, it will default to "" (latest)|
|`components[index].parameters`|`object`|no|The component's parameters|
|`components[index].render`|`string`|no|The component's render mode. When not specified, it will be the one specified in the options (for all components); if none is specified in options, it will default to `server`. When `server`, the rendering will be performed on the server-side and the result will be component's html. If `client`, the html will contain a promise to do the rendering on the browser.|

Options:

|Parameter|type|mandatory|description|
|---------|----|---------|-----------|
|`container`|`boolean`|no|Default true, when false, renders a component without its <oc-component> container|
|`disableFailoverRendering`|`boolean`|no|Disables the automatic failover rendering in case the registry times-out (in case configuration.registries.clientRendering contains a valid value.) Default false|
|`headers`|`object`|no|An object containing all the headers that must be forwarded to the component|
|`ie8`|`boolean`|no|Default false, if true puts in place the necessary polyfills to make all the stuff work with ie8|
|`render`|`string`|no|Default `server`. When `server`, it will return html. When `client` will produce the html to put in the page for post-poning the rendering to the browser|
|`timeout`|`number` (seconds)|no|Default 5. When request times-out, the callback will be fired with a timeout error and a client-side rendering response (unless `disableFailoverRendering` is set to `true`)|

Example:
```js
...
client.renderComponents([{
  name: 'header',
  parameters: { loggedIn: true }
}, {
  name: 'footer',
  version: '4.5.X'
}, {
  name: 'advert',
  parameters: { position: 'left' },
  render: 'client'
}], {
  container: false,
  headers: {
    'accept-language': 'en-US'
  },
  timeout: 3.0
}, function(errors, htmls){
  console.log(html);
  // => ["<div>Header</div>", 
  //     "<p>Footer</p>", 
  //     "<oc-component href=\"\/\/registry.com\/advert\/?position=left\"><\/oc-component>"]
});
```
