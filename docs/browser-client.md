The browser client
==================

When using the oc library, oc exposes a set of functionalities on the `window.oc` namespace.

## Including the script

The `oc-client` client-side library is available as a component inside a registry. To include it in your page, the registry exposes a shortcut so that you consume a version that matches the registry you are using.
```js
<script src="//your-registry.company.com/oc-client/script.js"></script>
```

We recommend to include the script at the bottom of your `<body>` html's tag. As default, as soon as it is loaded, it will do a call to `oc.renderUnloadedComponents();` to render all the components found in the DOM. This means that if you include the script before your components, you will need to manually call `oc.renderUnloadedComponents();` to render the components after the library is ready.

## How to use client-side functionalities

Most commonly in your page (inside or outside a component's context) you are going to take advantage of some of this functionalities. Given the asynchronous nature of components' loading and multiple rendering strategies, you may want to ensure you action is performed when the client is ready and available. This pattern guarantees things are going to work smoothly:

```js
window.oc = window.oc || {};
oc.cmd = oc.cmd || [];
oc.cmd.push(function(oc){
  // do stuff with the oc object
});
```

For example, if this script is inside a component and your component is loaded on the server-side before the `oc-client.js`, this is going to be executed as soon as the client is ready. If it is loaded after the `oc-client.js`, and the client is initialised and ready (for example in a client-side rendering situation) it's going to be executed straight away as soon as it is placed inside the DOM.

## oc custom settings

To customise the library settings, you need to expose them before the client. Example:

```html
<script>var oc = { conf: { retryInterval: 2000 }};</script>
<script src="//registry.components.com/oc-client/script.js"></script>
```

Available settings:

|Parameter|type|default|description|
|---------|----|-------|-----------|
|`debug`|`boolean`|false|When `true`, prints stuff in the console|
|`retryInterval`|`number` (milliseconds)|5000|Retry interval for when component rendering fails|
|`retryLimit`|`number`|30|Max number of retries when component rendering fails|
|`retrySendNumber`|`boolean`|true|Appends an `__ocRetry=(number)` to a request to mark the retry number. This is a quite powerful feature that you can handle in the server-side logic in order to make your component even behave differently in case something is going wrong|
|`tag`|`string`|`oc-component`|The html tag you want to use for your components in the page. Note that IE8 is going to use a `div` in any case as custom tags are not well supported.|

### oc.build (options)

It will build an oc-component tag for provided parameters:

|Parameter|type|description|
|---------|----|-----------|
|`baseUrl`|`string`|The base url of the registry|
|`name`|`string`|The component's name|
|`parameters`|`array of objects` (optional)|The component's parameters|
|`version`|`string` (optional)|The component's version|

Example:

```js
var html = oc.build({
  baseUrl: 'https://my-registry.com/components',
  name: 'my-component',
  version: '~2.3.4',
  parameters: {
    age: 23,
    hello: 'world'
  }
});

// html => <oc-component href="https://my-registry.com/components/my-component/~2.3.4/?age=23&hello=world"></oc-component>
```

### oc.events.on(eventName, callback);

This is for subscribing to specific events. The callback will be a tuple of `(eventDetails, [eventData])` objects. Supported events:

|eventName|eventData|
|---------|---------|
|`oc:ready`|oc global getter|
|`oc:rendered`|An object containing the rendered component data. Example: `{ name: 'component', version: '1.2.3', id: '827346283476', html: '<div>hi</div>'}`|

### oc.renderNestedComponent ($el, callback);

Given a jQuery selected $el <oc-component> element, renders it and then executes the callback function.

### oc.renderUnloadedComponents ()

Scans the DOM looking for unrendered components and does the rendering. It may be a little bit expensive, so in case you know where the component is, use [renderNestedComponent](#ocrendernestedcomponent-el-callback) instead.

### oc.require ([namespace], url, callback)

A minimal require.js functionality. Loads a file inside the head, and then fires the callback. If it is a `.css` extension it will loaded as `<link>`, if it has a `.js` extension it will be loaded as `<script>`.
When the namespace is provided, the load will happen only if `window[namespace]` is `undefined`. This is particularly useful in case we want to use a javascript dependency and we want to load it only if the container does not exposes it on the global scope.

Example:

```js
oc.require('_', 'https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js', function(_){
  console.log(_.first([1, 2]));
});
```
