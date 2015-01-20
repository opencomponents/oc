oc
=============

An experimental framework to serve as proof of concept for a robust, resilient, and distributed web components' delivery system.

Node version: **0.10.0** required

Build status: [![Build Status](https://secure.travis-ci.org/opentable/oc.png?branch=master)](http://travis-ci.org/opentable/oc)

[![NPM](https://nodei.co/npm/oc.png?downloads=true)](https://npmjs.org/package/oc)

# Introduction

The framework consists mainly on 4 parts.

The `components` are small units of isomorphic code mainly consisting of html, javascript, css. Optionally they can contain some logic so that there is a server-side javascript node.js part that composes a model to be used to render the html view. When they are `rendered` they become pieces of pure html to be injected in any html page.

The `library` is where the components are stored. When components depend on static resources, such as images, css files, etc., everything is stored, during the packaging and publishing, in the publicly-exposed part of the library that serves as cdn.

The `registry` is a rest api that is used to consume, retrieve, and publish components. As they are immutable, the registry is the entity that directs the traffic between the library and the consumers.

The `consumers` are websites or microsites (small indipendently deployable web sites all connected by a front-door service or any form of routing mechanism) that need to use components to render partial contents in their web pages.

# Use cases

The goal is to explore the possibility of having a system that would allow big corporations (that may involve hundreds of engineers on some projects) to have some tools that should facilitate code sharing, reduce dependencies, and to approach easily to new features and experiments.

# Usage

TODO

# License

MIT

# Contributors

* [@matteofigus](https://github.com/matteofigus)
