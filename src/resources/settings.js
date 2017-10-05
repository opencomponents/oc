'use strict';

module.exports = {
  configFile: {
    src: './oc.json'
  },
  filesToIgnoreOnDevWatch: /node_modules|package\.tar\.gz|_package|\.sw[op]|\.git\/|\.DS_Store|oc\.json/,
  maxLoopIterations: 1e9,
  registry: {
    acceptRenderedHeader: 'application/vnd.oc.rendered+json',
    acceptUnrenderedHeader: 'application/vnd.oc.unrendered+json',
    acceptInfoHeader: 'application/vnd.oc.info+json',
    componentInfoPath: '/~info',
    componentPreviewPath: '/~preview',
    defaultTempPath: './temp/',
    localStaticRedirectorPath: 'static/'
  }
};
