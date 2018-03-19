![oc](https://raw.githubusercontent.com/opencomponents/oc/master/logo-type.png)
=============

OpenComponents, **serverless in the front-end world**.

OpenComponents is an open-source framework that allows fast-moving teams to easily build and deploy front-end components. It abstracts away complicated infrastructure and leaves developers with very simple, but powerful building blocks that handle scale transparently.

#### How does it work?

First, **you create your component**. It can contain logic to get some data (using node.js) and then the view, including css and js. It can be what you want, including *React* or *Angular* components or whatever you like.

Then, **you publish it** to the OpenComponents registry and you wait a couple of seconds while the registry prepares your stuff to be production-ready.

Now, every web app in your private or public network can **consume the component** via its own HTTP endpoint during server-side rendering or just in the browser.

We have been using it for more than two years in production at OpenTable, for shared components, third party widgets, e-mails and more. [Learn more about OC](http://tech.opentable.co.uk/blog/2016/04/27/opencomponents-microservices-in-the-front-end-world/).

[![npm version](https://img.shields.io/npm/v/oc.svg)](https://npmjs.org/package/oc)
[![node version](https://img.shields.io/node/v/oc.svg)](https://npmjs.org/package/oc)
[![Dependency Status](https://david-dm.org/opencomponents/oc.svg)](https://david-dm.org/opencomponents/oc)
[![Known Vulnerabilities](https://snyk.io/test/github/opencomponents/oc/badge.svg)](https://snyk.io/test/github/opencomponents/oc)
[![downloads](https://img.shields.io/npm/dm/oc.svg?label=downloads+from+npm)](https://npmjs.org/package/oc)
[![Join the chat at https://gitter.im/opentable/oc](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/opentable/oc?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Greenkeeper badge](https://badges.greenkeeper.io/opencomponents/oc.svg)](https://greenkeeper.io/) 
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fopencomponents%2Foc.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fopencomponents%2Foc?ref=badge_shield)

## Links

- [Documentation](https://github.com/opencomponents/oc/wiki)
- [Requirements and build status](#requirements-and-build-status)
- [Changelog](CHANGELOG.md)
- [Awesome resources about OC](https://github.com/matteofigus/awesome-oc)
- [Contributing guidelines](CONTRIBUTING.md)
- [Code of conduct](CONTRIBUTING.md#code-of-conduct)
- [Troubleshooting](CONTRIBUTING.md#troubleshooting)
- [Gitter chat](https://gitter.im/opentable/oc)
- oc@opentable.com

## Requirements and build status

Disclaimer: This project is still under heavy development and the API is likely to change at any time. In case you would find any issues, check the [troubleshooting page](CONTRIBUTING.md#troubleshooting).

[![linux build](https://img.shields.io/travis/opencomponents/oc/master.svg?label=linux+build)](http://travis-ci.org/opencomponents/oc)

| Node6             | Node7             | Node8            | 
|-------------------|-------------------|-------------------|
| [![Node6][1]][4] | [![Node7][2]][4] | [![Node8][3]][4] |

[1]: https://travis-matrix-badges.herokuapp.com/repos/opencomponents/oc/branches/master/1
[2]: https://travis-matrix-badges.herokuapp.com/repos/opencomponents/oc/branches/master/2
[3]: https://travis-matrix-badges.herokuapp.com/repos/opencomponents/oc/branches/master/3
[4]: https://travis-ci.org/opencomponents/oc


[![windows build](https://img.shields.io/appveyor/ci/matteofigus/oc/master.svg?label=windows+build)](https://ci.appveyor.com/project/matteofigus/oc)

## License

MIT

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fopencomponents%2Foc.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fopencomponents%2Foc?ref=badge_large)
