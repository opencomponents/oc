Advanced operations
===================

1. [Add some logic](#add-some-logic)
1. [req properties](#req-properties)
1. [Add static resource to the component](#add-static-resource-to-the-component)
  1. [Prepare package file](#prepare-package-file)
  1. [Add image in the view template](#add-image-in-the-view-template)
  1. [Update server file](#update-server-file)
1. [Node.js dependencies on the server.js](#nodejs-dependencies-on-the-serverjs)
  1. [Local development](#local-development)
  1. [Publishing](#publishing)

# Add some logic

We can create components which provide static content. In that case our view could look like this:

```html
<div>hello world</div>
```
and we don't need to modify any other files.

But when we want to provide some additional logic in our view:

```html
<div>hello {{name}}</div>
```
we have to modify our `server.js` (model provider).

In the given example, we want to pass name parameter to our view. To achieve this goal, we can modify server file in this way:

```js
'use strict';

module.exports.data = function(req, callback){
  callback(null, {
    name: "John"
  });
};
```
The `first parameter` is used in case we want to fire an error and avoid the rendering.

The `second parameter` of the `callback` function is a view-model (JSON object) which is used by the view.

However, for more complicated operations we may need query parameters from component request. In this case we can use `params` property from [req](#req-properties) object (first parameter of our server function).

In our example we want to extract `name` parameter from the `req` object:
```js
module.exports.data = function(req, callback){
  callback(null, {
    name: req.params.name || 'John'
  });
};
```
To consume the component passing the `name` parameter we need to modify the reference link, e.g:

```html
  <oc-component href="http://localhost:3030/hello-world?name=James"></oc-component>
```

# req properties

Req represents request and consists of the following fields:

```js
{
  "acceptLanguage": [
    {
      "code": "en",
      "region": "US",
      "quality": 1
    },
    {
      "code": "en",
      "quality": 0.8
    }
  ],
  "baseUrl": "http://localhost:3030/",
  "env": {
    "name": "local"
  },
  "params": {
    "name": "Johnny"
  },
  "staticPath": "http://localhost:3030/hello-world/1.0.0/static/"
}
```

|Parameter|Type|Description|
|---------|----|-----------|
|`acceptLanguage`|`array of objects`|represents parsed `accept-language` part of the request header sorted by quality. More details [here](https://github.com/opentable/accept-language-parser).|
|`baseUrl`|`string`|represents Url to the registry where the components are stored. This is particularly useful when we want to nest components that are hosted in the same registry.|
|`env`|`object`|represents the registry environment variables. The registry's admin [can share here arbitrary data](registry.md#registry-configuration).|
|`params`|`object`|represents parameters extracted from the query string.|
|`staticPath`|`string`|represents the path to static resources i.e. images, styles, javascript files. This is particularly useful when we want to [reference static resources to the view](#add-static-resource-to-the-component).|

# Add static resource to the component

In this example an image (`static/static_resource.png`) will be our static resource.

## Prepare package file
First step is to prepare `package.json` file. It is necessary to add `static` property in `oc.files` object:
```js
{
  "name": "hello-world",
  "description": "description of my hello-world component",
  "version": "1.0.0",
  "repository": "",
  "oc": {
    "files": {
      "data": "server.js",
      "template": {
        "src": "template.html",
        "type": "handlebars"
      }
      "static": ["static"]
    }
  }
}
```
It is an array of names of directories. The `static`'s directory content will be included inside the package.

## Add image in the view template

We can add image to the component view template using `img` tag in which `src` attribute is bound to `img` viewModel property.
```html
<img src="{{path}}/static_resource.png" />
```

## Update server file
To provide `img` parameter in our viewModel we need to update `server.js`. The important thing is we need to use `req.staticPath` to provide url to the static resources:
```js
module.exports.data = function(req, callback){
  callback(null, {
    path: req.staticPath
  });
};
```

# Node.js dependencies on the server.js

By default, `require` is not allowed on a `server.js`. This helps to keep components' logic clean and small. However, you can consume dependencies if the registry's owner agrees on making them available.

## Local development

When in a directory of components, install the dependency using npm and then start the watcher:
```sh
ls
# my-component another-component
npm install --prefix . underscore
ls
# my-component another-component node_modules
oc dev . 3030
```
Now it will be possible to `require('underscore')` inside a `server.js`.

## Publishing

When a dependency is used, during publishing, the registry may deny a component to be published if the dependency is not been [vetted by the registry's owner](registry.md#registry-configuration).
