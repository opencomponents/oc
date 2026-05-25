---
sidebar_position: 6
---

# Client-side operations

When using the oc library, oc exposes a set of functionalities on the `window.oc` namespace.

## Including the script

The `oc-client` client-side library is available as a component inside a registry. To include it in your page, the registry exposes a shortcut so that you consume a version that matches the registry you are using.

```js
<script src="//your-registry.company.com/oc-client/client.js"></script>
```

We recommend to include the script at the bottom of your `<body>` html's tag. As default, as soon as it is loaded, it will do a call to `oc.renderUnloadedComponents();` to render all the components found in the DOM. This means that if you include the script before your components, you will need to manually call `oc.renderUnloadedComponents();` to render the components after the library is ready.

## How to use client-side functionalities

Most commonly in your page (inside or outside a component's context) you are going to take advantage of some of this functionalities. Given the asynchronous nature of components' loading and multiple rendering strategies, you may want to ensure you action is performed when the client is ready and available. This pattern guarantees things are going to work smoothly:

```js
window.oc = window.oc || {};
oc.cmd = oc.cmd || [];
oc.cmd.push(function (oc) {
  // do stuff with the oc object
});
```

For example, if this script is inside a component and your component is loaded on the server-side before the `oc-client.js`, this is going to be executed as soon as the client is ready. If it is loaded after the `oc-client.js`, and the client is initialised and ready (for example in a client-side rendering situation) it's going to be executed straight away as soon as it is placed inside the DOM.

## oc custom settings

To customise the library settings, you need to expose them before the client. Example:

```html
<script>
  var oc = { conf: { retryInterval: 2000 } };
</script>
<script src="//registry.components.com/oc-client/client.js"></script>
```

Available settings:

| Parameter          | type                    | description                                                                                                                                                                                                                                   | default                                                                                                                                                                                                                                                                                              |
| ------------------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `debug`            | `boolean`               | When `true`, prints stuff in the console                                                                                                                                                                                                      | false                                                                                                                                                                                                                                                                                                |
| `globalParameters` | `object`                | When provided, all the calls to client-side rendering or getData() will append the globalParameters to all the components                                                                                                                     | {}                                                                                                                                                                                                                                                                                                   |
| `loadingMessage`   | `string`                | The message shown inside the component's container during loading                                                                                                                                                                             |                                                                                                                                                                                                                                                                                                      |
| `retryInterval`    | `number` (milliseconds) | Retry interval for when component rendering fails                                                                                                                                                                                             | 5000                                                                                                                                                                                                                                                                                                 |
| `retryLimit`       | `number`                | Max number of retries when component rendering fails                                                                                                                                                                                          | 30                                                                                                                                                                                                                                                                                                   |
| `retrySendNumber`  | `boolean`               | Appends an `__ocRetry=(number)` to a request to mark the retry number. This is a quite powerful feature that you can handle in the server-side logic in order to make your component even behave differently in case something is going wrong | true                                                                                                                                                                                                                                                                                                 |
| `templates`        | `array`                 | The configuration needed for performing client-side rendering of specific template types.                                                                                                                                                     | `[{"type": "oc-template-jade","externals": [{"global": "jade","url": "https://unpkg.com/jade-legacy@1.11.1/runtime.js"}]},{"type": "oc-template-handlebars","externals": [{"global": "Handlebars","url": "https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.0.6/handlebars.runtime.min.js"}]}]` |
| `tag`              | `string`                | The html tag you want to use for your components in the page                                                                                                                                                                                  | `oc-component`                                                                                                                                                                                                                                                                                       |

## API

### oc.addStylesToHead (styles)

Append some CSS style inside the `<head>` of the page inside a `<style>` tag

### oc.build (options)

It will build an oc-component tag for provided parameters:

| Parameter    | type                          | description                  |
| ------------ | ----------------------------- | ---------------------------- |
| `baseUrl`    | `string`                      | The base url of the registry |
| `name`       | `string`                      | The component's name         |
| `parameters` | `array of objects` (optional) | The component's parameters   |
| `version`    | `string` (optional)           | The component's version      |

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

| eventName     | eventData                                                                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `oc:ready`    | oc global getter                                                                                                                               |
| `oc:rendered` | An object containing the rendered component data. Example: `{ name: 'component', version: '1.2.3', id: '827346283476', html: '<div>hi</div>'}` |

### oc.events.fire(eventName [, data]);

This is for firing an event and optionally attach an object to it.

### oc.events.reset();

This is for removing all the subscriptions to all events.

### oc.getData(options, callback);

This is to postback to component's server.js and get just the data back. Callback's signature is (err, json). Options are:

| Parameter    | type                          | description                                                |
| ------------ | ----------------------------- | ---------------------------------------------------------- |
| `baseUrl`    | `string`                      | The base url of the registry                               |
| `name`       | `string`                      | The component's name                                       |
| `json`       | `boolean` (optional)          | If requesting the parameter using JSON instead of formdata |
| `parameters` | `array of objects` (optional) | The component's parameters                                 |
| `version`    | `string` (optional)           | The component's version                                    |

### oc.renderNestedComponent ($el, callback);

Given a HTMLElement selected $el `<oc-component>` element, renders it and then executes the callback function.

### oc. registerTemplates (`[templates]`)

Allow to add support for client-side rendering for specific templates after the client has been already initialized and configured. It accepts an array of templates configuration and returns an array of all the templates configured.

Example:

```js
cons templates = oc.registerTemplates([{
  "type": "custom-react-template",
  "externals": [{
    "global": "React",
    "url": "https://cdnjs.cloudflare.com/ajax/libs/react/15.6.1/react.min.js"
  }]
}]);
```

[Learn more about the templates system](/docs/miscellaneous/template-system)

### oc.renderUnloadedComponents ()

Scans the DOM looking for unrendered components and does the rendering. It may be a little bit expensive, so in case you know where the component is, use [renderNestedComponent](#ocrendernestedcomponent-el-callback) instead.

### oc.require ([namespace], url, callback)

A minimal require.js functionality. Loads a file inside the head, and then fires the callback. If it is a `.css` extension it will loaded as `<link>`, if it has a `.js` extension it will be loaded as `<script>`.
When the namespace is provided, the load will happen only if `window[namespace]` is `undefined`. This is particularly useful in case we want to use a javascript dependency and we want to load it only if the container does not exposes it on the global scope.

Example:

```js
oc.require(
  '_',
  'https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js',
  function (_) {
    console.log(_.first([1, 2]));
  }
);
```

### oc.requireSeries ([externalDependenciesToLoad], callback)

A little utility built around oc.require. Loads a series of dependencies in the given order, and then fires the callback.
This is particularly useful in case we want to use multiple javascript dependencies that depends on each-other and we want to load them only if the container does not exposes them on the global scope.

Example:

```js
oc.requireSeries(
  [
    {
      global: 'React',
      url: 'https://cdn.com/.../react.js'
    },
    {
      global: 'ReactDOM',
      url: 'htpss://cdn.com/.../react-dom.js'
    }
  ],
  function () {
    // You can now use React and ReactDOM here
  }
);
```
