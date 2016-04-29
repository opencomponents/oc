'use strict';

module.exports = {
  configFile: {
    src: './oc.json'
  },
  maxLoopIterations: 1e9,
  registry: {
    componentInfoPath: '/~info',
    componentPreviewPath: '/~preview',
    defaultTempPath: './temp/',
    localStaticRedirectorPath: 'static/'
  }
};
