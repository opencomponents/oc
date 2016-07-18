'use strict';

module.exports = {
  configFile: {
    src: './oc.json'
  },
  maxLoopIterations: 1e9,
  registry: {
    acceptRenderedHeader: 'application/vnd.oc.rendered+json',
    acceptUnrenderedHeader: 'application/vnd.oc.unrendered+json',
    componentInfoPath: '/~info',
    componentPreviewPath: '/~preview',
    defaultTempPath: './temp/',
    localStaticRedirectorPath: 'static/'
  }
};
