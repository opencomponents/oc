# Advanced operations

1. [Add some logic](#add-some-logic)
1. [req properties](#req-properties)
1. [Add static resource to the component](#add-static-resource-to-the-component)
  1. [Prepare package file](#prepare-package-file)
  1. [Add image in the view template](#add-image-in-the-view-template)
  1. [Update server file](#update-server-file)

## Add some logic

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

In given example, we want to pass name parameter to our view. To achieve this goal, we can modify server file in this way:

```js
'use strict';

module.exports.data = function(req, callback){
  callback(null,
    {
      name: "John"
    });
};
```
<strong>The first parameter??</strong>

The second parameter of the `callback` function is a viewModel (JSON object) which is used by the view.

However, for more complicated operations we may need query parameters from component request. In this case we can use `params` property from [req](#req-properties) object (first parameter of our server function).

In our example we want to extract `name` parameter from the `req` object:
```js
module.exports.data = function(req, callback){
  callback(null,
    {
      name: req.params.name ? req.params.name : 'anybody?'
    });
};
```
To ensure passing `name` parameter we need to modify reference link to our component on the page which uses it,  e.g:

```html
...
  <oc-component href="http://localhost:3030/hello-world?name=James">
    Error during rendering
  </oc-component>
...
```

Given example doesn't provide us dynamically changed url, but we can use some javascript code to make it work dynamically.

## req properties

Req represents request and consists of following fields:

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
* `acceptLanguage`: `array of objects`, represents parsed `accept-language` part of the request header,
  * `code`: `string`, represents language abbreviation
  * `region`: `string`, represents country code
  * `quality`: `number`, represents an estimate of the user's preference for the language
* `baseUrl`: `string`, represents Url to the registry where the component is stored
* `env`: `object`, represents the registry environment
  * `name`: `string`, represents the name of the environment
* `params`: `object`, represents parameters extracted from the query string (in this case there is one parameter named `name` with `Johnny` as a value)
* `staticPath`: `string`, represents the path to static resources i.e. images, styles, javascript files.

## Add static resource to the component

In this example an image (`static_resource.png`) will be our static resource.

### Prepare package file
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
      "static": ["static_resource.png"]
    }
  }
}
```
It is an array of names of files. During packaging the component all the files from `static` array will be added to the package.

### Add image in the view template

We can add image to the component view template using `img` tag in which `src` attribute is bound to `img` viewModel property.
```html
<img src={{img}}>
```

### Update server file
To provide `img` parameter in our viewModel we need to update `server.js`. The important thing is we need to use `req.staticPath` to provide url to the static resources:
```js
module.exports.data = function(req, callback){
  callback(null,
    {
      img: req.staticPath + "static_resource.png"
    });
};
```
