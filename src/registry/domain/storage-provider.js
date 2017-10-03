'use strict';

const S3 = require('./s3');
const GS = require('./google-storage');

module.exports = function(conf) {
  let getFile;
  let getJson;
  let getUrl;
  let listSubDirectories;
  let maxConcurrentRequests = 20;
  let putDir;
  let putFile;
  let putFileContent;

  if (conf.s3) {
    const s3 = new S3(conf);
    getFile = s3.getFile;
    getFile = s3.getFile;
    getJson = s3.getJson;
    getUrl = s3.getUrl;
    listSubDirectories = s3.listSubDirectories;
    maxConcurrentRequests = s3.maxConcurrentRequests;
    putDir = s3.putDir;
    putFile = s3.putFile;
    putFileContent = s3.putFileContent;
  } else if (conf.gs) {
    const gs = new GS(conf);
    getFile = gs.getFile;
    getFile = gs.getFile;
    getJson = gs.getJson;
    getUrl = gs.getUrl;
    listSubDirectories = gs.listSubDirectories;
    maxConcurrentRequests = gs.maxConcurrentRequests;
    putDir = gs.putDir;
    putFile = gs.putFile;
    putFileContent = gs.putFileContent;
  }
  return {
    getFile,
    getJson,
    getUrl,
    listSubDirectories,
    maxConcurrentRequests: 20,
    putDir,
    putFile,
    putFileContent
  };
};
