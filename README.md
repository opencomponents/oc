![oc](https://raw.github.com/opentable/oc/master/logo.png)
=============

OpenComponents is a framework to develop and deploy robust and distributed html components.

The goal is to own a system that allows big corporations (that may involve hundreds of engineers on a number of projects) to have tools to facilitate code sharing, reduce dependencies, and easily approach new features and experiments.

[![npm version](https://img.shields.io/npm/v/oc.svg)](https://npmjs.org/package/oc)
[![node version](https://img.shields.io/node/v/oc.svg)](https://npmjs.org/package/oc)
[![downloads](https://img.shields.io/npm/dm/oc.svg?label=downloads+from+npm)](https://npmjs.org/package/oc)
[![Join the chat at https://gitter.im/opentable/oc](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/opentable/oc?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![linux build](https://img.shields.io/travis/opentable/oc/master.svg?label=linux+build)](http://travis-ci.org/opentable/oc)
[![windows build](https://img.shields.io/appveyor/ci/matteofigus/oc.svg?label=windows+build)](https://ci.appveyor.com/project/matteofigus/oc)

[![Sauce Test Status](https://saucelabs.com/browser-matrix/matteofigus.svg)](https://saucelabs.com/u/matteofigus)

Disclaimer: This project is still under heavy development and the API is likely to change at any time. In case you would find any issues, check the [troubleshooting page](CONTRIBUTING.md#troubleshooting).

# Index
1. [Introduction](#introduction)
1. [Components](#components)
  * [Creation](#creation)
  * [Editing, debugging, testing](#editing-debugging-testing)
  * [Publishing to a registry](#publishing-to-a-registry)
1. [Consuming components](#consuming-components)
  * [Server-side rendering via rest API](#server-side-rendering-via-rest-api)
  * [Server-side rendering with node.js](#server-side-rendering-with-nodejs)
  * [Server-side rendering with Ruby](#server-side-rendering-with-ruby)
  * [Client-side rendering](#client-side-rendering)
  * [Server-side rendering with client-side failover](#server-side-rendering-with-client-side-failover)
1. [Install the cli](#install-the-cli)
1. [Setup a library](#setup-a-library)
1. [Setup a registry](#setup-a-registry)

# Introduction
OpenComponents involves two parts:

* The [`components`](#components) are small units of isomorphic code mainly consisting of html, javascript, css. They can optionally contain some logic, allowing a server-side node.js application to compose a model that is used to render the view. After rendering they are pieces of pure html to be injected in any html page.
* The [`consumers`](#consuming-components) are websites or microsites ([small independently deployable web sites all connected by a front-door service or any routing mechanism](http://tech.opentable.co.uk/blog/2015/02/09/dismantling-the-monolith-microsites-at-opentable/)) that need components for rendering partial contents in their web pages.

The framework consists mainly of three parts.

* The [`cli`](#install-the-cli) allows developers to create, develop, test, and publish components.
* The [`library`](#setup-a-library) is where the components are stored after the publishing. When components depend on static resources (such as images, css files, etc.) these are stored, during packaging and publishing, in a publicly-exposed part of the library that serves as cdn.
* The [`registry`](#setup-a-registry) is a rest api that is used to consume, retrieve, and publish components. Since they are immutable, the registry is the entity that handles the traffic between the library and the consumers.

# Components
A component is a directory composed by

|File|Description|
|--------------------|-------------|
|`package.json`|The component definition, dependencies, and more.|
|`view.html`|The view containing the markup. Currently we support `Handlebars` and `Jade`. It can contain some CSS under the `<style>` tag and client-side Javascript under the `<script>` tag.|
|`server.js` (optional)|If the component has some logic, including consuming services, this is the entity that will produce the view-model to compile the view.|
|static contents (optional)|Images, Javascript, and files that will be referenced in the HTML markup.|
|*|Any other files that will be useful for the development such as tests, docs, etc.|

After publishing, components are immutable and semantic versioned.

[Getting started with components](docs/getting-started.md)

[Advanced operations](docs/advanced-operations.md)

## Creation
To create a folder containing the component:
```sh
npm install oc -g
oc init hello-world
```

## Editing, debugging, testing

To start a local test registry using a components' folder as a library with a watcher:
```sh
oc dev . 3030
```

To see how the component looks like when consuming it:
```sh
oc preview http://localhost:3030/hello-world
```

As soon as you make changes on the component, you will be able to refresh this page and see how it looks.

## Publishing to a registry

You will need an online registry connected to a library. A component with the same name and version cannot already exist on that registry.
```sh
# you have to do the registry config first, just once
oc registry add http://my-components-registry.mydomain.com

# then, ship it
oc publish hello-world/
```

Now, it should be available at `http://my-components-registry.mydomain.com/hello-world`.

# Consuming components

From a consumer's perspective, a component is an HTML fragment. You can render components just on the client-side, just on the server-side, or use the client-side rendering as failover strategy for when the server-side rendering fails (for example because the registry is not responding quickly or is down).

You don't need node.js to consume components on the server-side. The registry can provide you rendered components so that you can consume them using any tech stack.

When published, components are immutable and semantic versioned. The registry allows consumers to get any version of the component: the latest patch, or minor version, etc.

## Server-side rendering via rest API

You can get rendered components via the registry rest api.
```sh
curl http://my-components-registry.mydomain.com/hello-world

{
  "href": "https://my-components-registry.mydomain.com/hello-world",
  "version": "1.0.0",
  "requestVersion": "",
  "html": "<oc-component href=\"https://my-components-registry.mydomain.com/hello-world\" data-hash=\"cad2a9671257d5033d2abfd739b1660993021d02\" id=\"2890594349\" data-rendered=\"true\" data-version=\"1.0.13\">Hello John doe!</oc-component>",
  "type": "oc-component",
  "renderMode": "rendered"
}
```

In case you would like to do the rendering yourself, try:
```sh
 curl http://my-components-registry.mydomain.com/hello-world/~1.0.0 -H Accept:application/vnd.oc.unrendered+json

{
  "href": "https://my-components-registry.mydomain.com/hello-world/~1.0.0",
  "version": "1.0.0",
  "requestVersion": "~1.0.0",
  "data": {
    "name": "John doe"
  },
  "template": {
    "src": "https://s3.amazonaws.com/your-s3-bucket/components/hello-world/1.0.0/template.js",
    "type": "handlebars",
    "key": "cad2a9671257d5033d2abfd739b1660993021d02"
  },
  "type": "oc-component",
  "renderMode": "unrendered"
}
```

In this case you get the compiled view + the data, and you can do the rendering, eventually, interpolating the view-model data and rendering the compiled view with it.

When retrieving multiple components, a [batch POST endpoint](docs/registry-post-route.md) allows to make a single request to the API.

## Server-side rendering with node.js

First install the node.js client in your project:
```sh
npm install oc-client --save
```

Then, this is what you would do with a simple node.js http app:
```js
var http = require('http'),
    Client = require('oc-client'),
    client = new Client({
      registries: {
        serverRendering: 'http://oc-registry.intranet.com/',
        clientRendering: 'https://components.mydomain.com' },
      components: {'hello-world': '~1.0.0'}
    });

http.createServer(function (req, res) {
  client.renderComponent('hello-world', function(err, html){
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('<html><head></head><body>' + html + '</body></html>');
  });
}).listen(4000);
```
Open `http://localhost:4000/` and enjoy!

More docs about the node.js client [here](client/README.md).

## Server-side rendering with Ruby

* [Ruby library](https://github.com/opentable/ruby-oc)
* [Rails plugin](https://github.com/opentable/opencomponents-rails)
* [Sinatra plugin](https://github.com/opentable/sinatra-opencomponents)

## Client-side rendering

To make this happen, your components registry has to be publicly available.
This is all you need:
```html
<html>
  <head></head>
  <body>
    <oc-component href="http://my-components-registry.mydomain.com/hello-world/1.X.X"></oc-component>
    <script src="http://my-components-registry.mydomain.com/oc-client/client.js" />
  </body>
</html>
```

For more information about client-side operations, look at [this page](docs/browser-client.md).

## Server-side rendering with client-side failover

When the registry is slow or returns errors while doing server-side rendering, you may want to unblock the server-side rendering and postpone it to make it happen on the client-side after the DOM is loaded. If your registry is publicly available and you use the node.js client, this is done automatically.
When on the client-side, a retry rendering attempt via Javascript will happen every ten seconds until the component is rendered.

If for some reasons you want to avoid client-side rendering when using the node.js client, you can do:
```js
var http = require('http'),
    oc = require('oc'),
    client = new oc.Client({
      ...
      disableFailoverRendering: true
    });

http.createServer(function (req, res) {
  client.renderComponent('hello-world', function(err, html){
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('<html><head></head><body>' + html + '</body></html>');
  });
}).listen(4000);
```

# Install the cli

```sh
npm install oc -g
# to see available commands:
oc
```

# Setup a library

At the moment the only supported library is Amazon S3. Create an account and get the API credentials; you will need them while setting up the registry.

# Setup a registry

The registry is a node.js express app that serves the components. You can have multiple registries connected to a library, but you can't have multiple libraries connected to a registry.
First, create a dir and install oc:
```sh
mkdir oc-registry && cd oc-registry
npm init
npm install oc --save
```

Then on the entry point, what you need on an `index.js` file is:

```js
var oc = require('oc');

var configuration = {
  verbosity: 0,
  baseUrl: 'https://my-components-registry.mydomain.com/',
  port: 3000,
  tempDir: './temp/',
  refreshInterval: 600,
  pollingInterval: 5,
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

registry.start(function(err, app){
  if(err){
    console.log('Registry not started: ', err);
    process.exit(1);
  }
});
```

For the registry configuration's documentation, [look at this page](docs/registry.md).

# License

MIT

# Contributors

If you wish to contribute, check the [contributing guidelines](CONTRIBUTING.md).

Maintainer:
* [@matteofigus](https://github.com/matteofigus)

Contributors:
* [@ajcw](https://github.com/ajcw)
* [@andyroyle](https://github.com/andyroyle)
* [@antwhite](https://github.com/antwhite)
* [@char1e5](https://github.com/char1e5)
* [@federicomaffei](https://github.com/federicomaffei)
* [@jankowiakmaria](https://github.com/jankowiakmaria)
* [@pbazydlo](https://github.com/pbazydlo)
* [@stevejhiggs](https://github.com/stevejhiggs)
* [@todd](https://github.com/todd)
* [@tpgmartin](https://github.com/tpgmartin)
