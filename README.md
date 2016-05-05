![oc](https://raw.github.com/opentable/oc/master/docs/logo.png)
=============

OpenComponents, **microservices in the front-end world**.

First, **you create your component**. It can contain logic to get some data (using node.js) and then the view, including css and js. It can be what you want, including *React* or *Angular* components or whatever you like.

Then, **you publish it** to the OpenComponents registry and you wait a couple of seconds while the registry prepares your stuff to be production-ready.

Now, every web app in your private or public network can **consume the component** via its own HTTP endpoint during server-side rendering or just in the browser.

We have been using for more than a year in production at OpenTable, for shared components, third party widgets, and more. [Learn more about OC](http://tech.opentable.co.uk/blog/2016/04/27/opencomponents-microservices-in-the-front-end-world/).

[![npm version](https://img.shields.io/npm/v/oc.svg)](https://npmjs.org/package/oc)
[![node version](https://img.shields.io/node/v/oc.svg)](https://npmjs.org/package/oc)
[![downloads](https://img.shields.io/npm/dm/oc.svg?label=downloads+from+npm)](https://npmjs.org/package/oc)
[![Join the chat at https://gitter.im/opentable/oc](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/opentable/oc?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# Index
1. [Introduction](#introduction)
2. [Components](#components)
  * [Creation](#creation)
  * [Editing, debugging, testing](#editing-debugging-testing)
  * [Publishing to a registry](#publishing-to-a-registry)
3. [Consuming components](#consuming-components)
  * [Client-side rendering](#client-side-rendering)
  * [Server-side rendering](#server-side-rendering)
4. [Install the cli](#install-the-cli)
5. [Setup a library](#setup-a-library)
6. [Setup a registry](#setup-a-registry)
7. [Tests](#tests)
8. [Contacts](#contacts)

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

## Server-side rendering

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

Nevertheless, for improving caching and response size, when using the `node.js` client or any language capable of executing server-side javascript the request will look more like:
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

* [Node.js library](client/README.md)
* [Ruby library](https://github.com/opentable/ruby-oc)
* [Rails plugin](https://github.com/opentable/opencomponents-rails)
* [Sinatra plugin](https://github.com/opentable/sinatra-opencomponents)

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

# Tests

[![linux build](https://img.shields.io/travis/opentable/oc/master.svg?label=linux+build)](http://travis-ci.org/opentable/oc)
[![windows build](https://img.shields.io/appveyor/ci/matteofigus/oc/master.svg?label=windows+build)](https://ci.appveyor.com/project/matteofigus/oc)

[![Sauce Test Status](https://saucelabs.com/browser-matrix/matteofigus.svg)](https://saucelabs.com/u/matteofigus)

Disclaimer: This project is still under heavy development and the API is likely to change at any time. In case you would find any issues, check the [troubleshooting page](CONTRIBUTING.md#troubleshooting).

# Contacts

We appreciate contributions, in terms of feedbacks, code, anything really. If you use OC in productions, please let us know (but there is no obligation on that as OC is MIT licensed).

* [contributing guidelines](CONTRIBUTING.md)
* [code of conduct](CONTRIBUTING.md#code-of-conduct)
* [troubleshooting](CONTRIBUTING.md#troubleshooting)
* [gitter chat](https://gitter.im/opentable/oc)
* oc@opentable.com

Contributors/Maintainers:
* [@ajcw](https://github.com/ajcw)
* [@andyroyle](https://github.com/andyroyle)
* [@antwhite](https://github.com/antwhite)
* [@char1e5](https://github.com/char1e5)
* [@federicomaffei](https://github.com/federicomaffei)
* [@jankowiakmaria](https://github.com/jankowiakmaria)
* [@matteofigus](https://github.com/matteofigus)
* [@mattiaerre](https://github.com/mattiaerre)
* [@pbazydlo](https://github.com/pbazydlo)
* [@stevejhiggs](https://github.com/stevejhiggs)
* [@todd](https://github.com/todd)
* [@tpgmartin](https://github.com/tpgmartin)

# License

MIT
