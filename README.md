oc
=============

An experimental framework to serve as proof of concept for a robust, resilient, and distributed web components' delivery system.

Node version: **0.10.0** required

Build status: Linux: [![Build Status](https://secure.travis-ci.org/opentable/oc.png?branch=master)](http://travis-ci.org/opentable/oc) | Windows: [![Build status](https://ci.appveyor.com/api/projects/status/8cklgw4hymutqrsg?svg=true)](https://ci.appveyor.com/project/matteofigus/oc)

[![NPM](https://nodei.co/npm/oc.png?downloads=true)](https://npmjs.org/package/oc)

#Index

1. [Introduction](#introduction)
1. [Usage](#usage)
  1. [Components](#components)
    * [Creation](#creation)
    * [Editing, debugging, testing](#editing-debugging-testing)
    * [Publishing to a registry](#publishing-to-a-registry)
  1. [Setup a library](#setup-a-library)
  1. [Setup a registry](#setup-a-registry)
  1. [Consuming components](#consuming-components)
    * [Server-side rendering via rest API](#server-side-rendering-via-rest-api)
    * [Server-side rendering with node.js](#server-side-rendering-with-nodejs)
    * [Client-side rendering](#client-side-rendering)
    * [Server-side rendering with client-side failover](#server-side-rendering-with-client-side-failover)


# Introduction

The framework consists mainly on 4 parts.

The [`components`](#components) are small units of isomorphic code mainly consisting of html, javascript, css. Optionally they can contain some logic so that there is a server-side javascript node.js part that composes a model to be used to render the html view. When they are `rendered` they become pieces of pure html to be injected in any html page.

The [`library`](#setup-a-library) is where the components are stored. When components depend on static resources, such as images, css files, etc., everything is stored, during the packaging and publishing, in the publicly-exposed part of the library that serves as cdn.

The [`registry`](#setup-a-registry) is a rest api that is used to consume, retrieve, and publish components. As they are immutable, the registry is the entity that directs the traffic between the library and the consumers.

The [`consumers`](#consuming-components) are websites or microsites (small independently deployable web sites all connected by a front-door service or any form of routing mechanism) that need to use components to render partial contents in their web pages.

The goal is to explore the possibility of having a system that would allow big corporations (that may involve hundreds of engineers on some projects) to have some tools that should facilitate code sharing, reduce dependencies, and to approach easily to new features and experiments.

# Usage

## Components

A component is a directory composed by
* `package.json` - contains the component definition, dependencies, and more.
* `view.html` - a template containing the markup. Currently we support `handlebars` but we plan to support `jade` too asap. It can contain some css under the `<style>` tag and cliend-side javascript under the `<script>` tag.
* optionally, `server.js` - In case the component has some logic, including consuming services, this is the entity that will produce the view-model to compile the view.
* optionally, some `static contents` such as images, js, and files that will be referenced in the html markup.
* any other files that will be useful for the development such as tests, docs, etc.

Components are immutable and semantic versioned.

### Creation
First, you create a component in a folder:
```sh
npm install oc -g
oc init hello-world
```

### Editing, debugging, testing

You may want to start a local test registry using a components' folder as a library with a watcher in order to consume it and debug it:
```sh
oc dev . 3030
```

Then you may want to create a blank html page to start playing with it and see how it looks:
```html
<html>
  <head>
    <script src="http://localhost:3030/scripts/oc-client.min.js"></script>
  </head>
  <body>
    <oc-component href="http://localhost:3030/hello-world">
      Optionally, some failover text here
    </oc-component>
  </body>
</html>
```

That's it, as soon as you make changes on the component, you will be able to refresh this page and see how it looks.

### Publishing to a registry

You will need an online registry connected to a library to do that. The only requisite is that a component with the same name and version does not exist already on that registry.
```sh
# you have to do the registry config first, just once
oc api add http://my-components-registry.mydomain.com

# then, ship it
oc publish hello-world/
```

Now, it should be there at `http://my-components-registry.mydomain.com/hello-world`.


## Setup a library

At the moment the only supported library is Amazon S3. Create an account and get the api credentials, you will need them while setting up the registry.

## Setup a registry

The registry is a node.js express app that serves the components. You can have multiple registries connected to a library, but you can't have multiple libraries connected to a registry.
First, create a dir and install oc:
```sh
mkdir oc-registry && cd oc-registry
npm init
npm install oc --save
```

Then on the entry point, that's pretty much what you need on a `index.js`:

```js
var oc = require('oc');

var configuration = {
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

var registry = new oc.Registry(configuration);

if(registry.err){
  return console.log(registry.err);
}

registry.start(function(err, app){
  if(err){
    console.log('Registry not started: ', err);
    process.exit(1);
  }
});

```

## Consuming components

A component needs to end up as a html fragment. You can render components just on the client-side. Or, just on the server-side. Or, use the client-side rendering only when the server-side rendering fails because the registry is not responding quickly or is down, as failover strategy.

You do not need node.js to do consume component on the server-side. The registry can provide you rendered component so that you can get server-side rendered components using any tech stack.

Then, components are immutable and the registry allow consumers to get any version of the component. So, when you create a component and you are the consumer too, you may choose to bind your site to the latest version of a component; if anyone else created a component and you want to be sure it does not break your stuff, you can connect your site to just the latest patch, or minor version, etc.

### Server-side rendering via rest API

You can get rendered components via the registry rest api.
```sh
curl http://my-components-registry.mydomain.com/hello-world

{
  "href": "https://my-components-registry.mydomain.com/hello-world",
  "version": "1.0.13",
  "requestVersion": "",
  "html": "<oc-component href=\"https://my-components-registry.mydomain.com/hello-world\" data-hash=\"cad2a9671257d5033d2abfd739b1660993021d02\" id=\"2890594349\" data-rendered=\"true\" data-version=\"1.0.13\">Hello John doe!</oc-component>",
  "renderMode": "rendered"
}
```
Just place the html result anywhere and it will just work.

In case you would like to do the rendering yourself, try:
```sh
 curl http://my-components-registry.mydomain.com/hello-world/~1.0.5 -H render-mode:pre-rendered

{
  "href": "https://my-components-registry.mydomain.com/hello-world/~1.0.5",
  "version": "1.0.13",
  "requestVersion": "~1.0.5",
  "data": {
    "name": "John doe"
  },
  "template": {
    "src": "https://s3.amazonaws.com/your-s3-bucket/components/hello-world/1.0.13/template.js",
    "type": "handlebars",
    "key": "cad2a9671257d5033d2abfd739b1660993021d02"
  },
  "type": "oc-component",
  "renderMode": "pre-rendered"
}
```

In this case, you can get the compiled view + the data, and you can do the rendering, eventually, interpolating the view-model data and rendering the compiled view with it.


### Server-side rendering with node.js

First install the node.js client in your project, setup the api binding, and then link a component:
```sh
npm install oc -g
npm install oc --save
oc registry add http://my-components-registry.mydomain.com/
oc link hello-world 1.0.X
```

Then, this is what you would do with a simple node.js http app:
```js
var http = require('http'),
    oc = require('oc');

var client = new oc.Client();

http.createServer(function (req, res) {
  client.renderComponent('hello-world', function(err, html){
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('<html><head></head><body>' + html + '</body></html>');
  });
}).listen(4000);
```
Open `http://localhost:4000/` and enjoy!

### Client-side rendering

To make this happen, your components' registry has to be publicly available.
This is all you need:
```html
<html>
  <head></head>
  <body>
    <script src="http://my-components-registry.mydomain.com/scripts/oc-client.min.js"></script>
    <oc-component href="http://my-components-registry.mydomain.com/hello-world/1.X.X"></oc-component>
  </body>
</html>
```

### Server-side rendering with client-side failover

When registry is slow or errors and you are doing server-side rendering, you may want to unblock the rendering and postpone the rendering to make it happen on the client-side after the DOM is loaded. If your registry is publicly available and you use the node.js client, this is done automatically. Cool, isn't it?
When on the client-side, once the dom is loaded, via javascript a retry rendering attempt will happen every 10 seconds until the component is rendered.

If for some reasons you want to avoid client-side rendering, when using the node.js client, you can do:
```js
var http = require('http'),
    oc = require('oc');

var client = new oc.Client({ disableFailoverRendering: true });

http.createServer(function (req, res) {
  client.renderComponent('hello-world', function(err, html){
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('<html><head></head><body>' + html + '</body></html>');
  });
}).listen(4000);
```

# License

MIT

# Contributors

* [@matteofigus](https://github.com/matteofigus)
