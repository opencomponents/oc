The browser client
==================

When using the oc library, oc exposes a set of functionalities on the `window.oc` namespace.

### oc.build(options)

It will build an oc-component tag for provided parameters:

|parameter|type|description|
|-|-|-|
|`baseUrl`|`string`|The base url of the registry|
|`name`|`string`|The component's name|
|`parameters`|`array of objects` (optional)|The component's parameters|
|`version`|`string` (optional)|The component's version|

Example:

```js
var html = oc.build{
  baseUrl: 'https://my-registry.com/components',
  name: 'my-component',
  version: '~2.3.4',
  parameters: {
    age: 23,
    hello: 'world'
  }
};

// html => <oc-component href="https://my-registry.com/components/my-component/~2.3.4/?age=23&hello=world"></oc-component>
```§

### oc.renderNestedComponent($el, callback);

Given a jQuery selected $el <oc-component> element, renders it and then executes the callback function.

### oc.renderUnloadedComponents()

Scans the DOM looking for unrendered components and does the rendering. It may be a little bit expensive, so in case you know where the component is, use [renderNestedComponent](#oc-rendernestedcomponents) instead.

### oc.require([namespace], url, callback)

A minimal require.js functionality. Loads a file inside the head, and then fires the callback. If it is a `.css` extension it will loaded as `<link>`, if it has a `.js` extension it will be loaded as `<script>`.
When the namespace is provided, the load will happen only if `window[namespace]` is `undefined`. This is particularly useful in case we want to use a javascript dependency and we want to load it only if the container does not exposes it on the global scope.

Example:

```js
oc.require('_', 'https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js', function(_){
  console.log(_.first([1, 2]));
});
```