'use strict';

const format = require('stringformat');
const fs = require('fs-extra');
const getUnixUtcTimestamp = require('oc-get-unix-utc-timestamp');
const path = require('path');
const _ = require('lodash');

const ComponentsCache = require('./components-cache');
const ComponentsDetails = require('./components-details');
const packageInfo = require('../../../package.json');
const requireTemplate = require('../../utils/require-template');
const S3 = require('./s3');
const settings = require('../../resources/settings');
const strings = require('../../resources');
const validator = require('./validators');
const versionHandler = require('./version-handler');

module.exports = function(conf) {
  const cdn = !conf.local && new S3(conf);
  const repositorySource = conf.local ? 'local repository' : 's3 cdn';
  const componentsCache = ComponentsCache(conf, cdn);
  const componentsDetails = ComponentsDetails(conf, cdn);

  const getFilePath = (component, version, filePath) =>
    `${conf.s3.componentsDir}/${component}/${version}/${filePath}`;

  const coreTemplates = ['oc-template-jade', 'oc-template-handlebars'];
  const templates = _.union(coreTemplates, conf.templates).map(template => {
    try {
      const ocTemplate = requireTemplate(template);
      const info = ocTemplate.getInfo();
      return {
        type: info.type,
        version: info.version,
        externals: info.externals
      };
    } catch (err) {
      throw err;
    }
  });

  const local = {
    getCompiledView: componentName => {
      if (componentName === 'oc-client') {
        return fs
          .readFileSync(
            path.join(
              __dirname,
              '../../components/oc-client/_package/template.js'
            )
          )
          .toString();
      }

      return fs
        .readFileSync(
          path.join(conf.path, `${componentName}/_package/template.js`)
        )
        .toString();
    },
    getComponents: () => {
      const validComponents = fs.readdirSync(conf.path).filter(file => {
        const isDir = fs.lstatSync(path.join(conf.path, file)).isDirectory();
        const isValidComponent = isDir
          ? fs
              .readdirSync(path.join(conf.path, file))
              .filter(file => file === '_package').length === 1
          : false;

        return isValidComponent;
      });

      validComponents.push('oc-client');
      return validComponents;
    },
    getComponentVersions: (componentName, callback) => {
      if (componentName === 'oc-client') {
        return callback(null, [
          fs.readJsonSync(path.join(__dirname, '../../../package.json')).version
        ]);
      }

      if (!_.includes(local.getComponents(), componentName)) {
        return callback(
          format(
            strings.errors.registry.COMPONENT_NOT_FOUND,
            componentName,
            repositorySource
          )
        );
      }

      callback(null, [
        fs.readJsonSync(path.join(conf.path, `${componentName}/package.json`))
          .version
      ]);
    },
    getDataProvider: componentName => {
      if (componentName === 'oc-client') {
        return fs
          .readFileSync(
            path.join(
              __dirname,
              '../../components/oc-client/_package/server.js'
            )
          )
          .toString();
      }

      return fs
        .readFileSync(
          path.join(conf.path, `${componentName}/_package/server.js`)
        )
        .toString();
    }
  };

  const repository = {
    getCompiledView: (componentName, componentVersion, callback) => {
      if (conf.local) {
        return callback(
          null,
          local.getCompiledView(componentName, componentVersion)
        );
      }

      cdn.getFile(
        getFilePath(componentName, componentVersion, 'template.js'),
        callback
      );
    },
    getComponent: (componentName, componentVersion, callback) => {
      if (_.isFunction(componentVersion)) {
        callback = componentVersion;
        componentVersion = undefined;
      }

      repository.getComponentVersions(componentName, (err, allVersions) => {
        if (err) {
          return callback(err);
        }

        if (allVersions.length === 0) {
          return callback(
            format(
              strings.errors.registry.COMPONENT_NOT_FOUND,
              componentName,
              repositorySource
            )
          );
        }

        const version = versionHandler.getAvailableVersion(
          componentVersion,
          allVersions
        );

        if (!version) {
          return callback(
            format(
              strings.errors.registry.COMPONENT_VERSION_NOT_FOUND,
              componentName,
              componentVersion,
              repositorySource
            )
          );
        }

        repository.getComponentInfo(
          componentName,
          version,
          (err, component) => {
            if (err) {
              return callback(`component not available: ${err}`, null);
            }
            callback(null, _.extend(component, { allVersions }));
          }
        );
      });
    },
    getComponentInfo: (componentName, componentVersion, callback) => {
      if (conf.local) {
        let componentInfo;

        if (componentName === 'oc-client') {
          componentInfo = fs.readJsonSync(
            path.join(
              __dirname,
              '../../components/oc-client/_package/package.json'
            )
          );
        } else {
          componentInfo = fs.readJsonSync(
            path.join(conf.path, `${componentName}/_package/package.json`)
          );
        }

        if (componentInfo.version === componentVersion) {
          return callback(null, componentInfo);
        } else {
          return callback('version not available');
        }
      }

      cdn.getJson(
        getFilePath(componentName, componentVersion, 'package.json'),
        callback
      );
    },
    getComponentPath: (componentName, componentVersion) => {
      const prefix = conf.local
        ? conf.baseUrl
        : `https:${conf.s3.path}${conf.s3.componentsDir}/`;
      return `${prefix}${componentName}/${componentVersion}/`;
    },
    getComponents: callback => {
      if (conf.local) {
        return callback(null, local.getComponents());
      }

      componentsCache.get((err, res) =>
        callback(err, res ? _.keys(res.components) : null)
      );
    },
    getComponentsDetails: callback => {
      if (conf.local) {
        return callback();
      }

      componentsDetails.get(callback);
    },
    getComponentVersions: (componentName, callback) => {
      if (conf.local) {
        return local.getComponentVersions(componentName, callback);
      }

      componentsCache.get((err, res) => {
        callback(
          err,
          !!res && !!_.has(res.components, componentName)
            ? res.components[componentName]
            : []
        );
      });
    },
    getDataProvider: (componentName, componentVersion, callback) => {
      if (conf.local) {
        return callback(null, local.getDataProvider(componentName));
      }

      cdn.getFile(
        getFilePath(componentName, componentVersion, 'server.js'),
        callback
      );
    },
    getStaticClientPath: () =>
      `https:${conf.s3.path}${getFilePath(
        'oc-client',
        packageInfo.version,
        'src/oc-client.min.js'
      )}`,

    getStaticClientMapPath: () =>
      `https:${conf.s3.path}${getFilePath(
        'oc-client',
        packageInfo.version,
        'src/oc-client.min.map'
      )}`,

    getStaticFilePath: (componentName, componentVersion, filePath) =>
      `${repository.getComponentPath(
        componentName,
        componentVersion
      )}${conf.local
        ? settings.registry.localStaticRedirectorPath
        : ''}${filePath}`,

    getTemplates: () => templates,

    init: callback => {
      if (conf.local) {
        return callback(null, 'ok');
      }

      componentsCache.load((err, componentsList) => {
        if (err) {
          return callback(err);
        }
        componentsDetails.refresh(componentsList, err =>
          callback(err, componentsList)
        );
      });
    },
    publishComponent: (
      pkgDetails,
      componentName,
      componentVersion,
      callback
    ) => {
      if (conf.local) {
        return callback({
          code: strings.errors.registry.LOCAL_PUBLISH_NOT_ALLOWED_CODE,
          msg: strings.errors.registry.LOCAL_PUBLISH_NOT_ALLOWED
        });
      }

      if (!validator.validateComponentName(componentName)) {
        return callback({
          code: strings.errors.registry.COMPONENT_NAME_NOT_VALID_CODE,
          msg: strings.errors.registry.COMPONENT_NAME_NOT_VALID
        });
      }

      if (!validator.validateVersion(componentVersion)) {
        return callback({
          code: strings.errors.registry.COMPONENT_VERSION_NOT_VALID_CODE,
          msg: format(
            strings.errors.registry.COMPONENT_VERSION_NOT_VALID,
            componentVersion
          )
        });
      }

      const validationResult = validator.validatePackageJson(
        _.extend(pkgDetails, {
          componentName,
          customValidator: conf.publishValidation
        })
      );

      if (!validationResult.isValid) {
        return callback({
          code: strings.errors.registry.COMPONENT_PUBLISHVALIDATION_FAIL_CODE,
          msg: format(
            strings.errors.registry.COMPONENT_PUBLISHVALIDATION_FAIL,
            validationResult.error
          )
        });
      }

      repository.getComponentVersions(
        componentName,
        (err, componentVersions) => {
          if (
            !versionHandler.validateNewVersion(
              componentVersion,
              componentVersions
            )
          ) {
            return callback({
              code:
                strings.errors.registry.COMPONENT_VERSION_ALREADY_FOUND_CODE,
              msg: format(
                strings.errors.registry.COMPONENT_VERSION_ALREADY_FOUND,
                componentName,
                componentVersion,
                repositorySource
              )
            });
          }

          pkgDetails.packageJson.oc.date = getUnixUtcTimestamp();
          fs.writeJSON(
            path.join(pkgDetails.outputFolder, 'package.json'),
            pkgDetails.packageJson,
            err => {
              if (err) {
                return callback(err);
              }
              cdn.putDir(
                pkgDetails.outputFolder,
                `${conf.s3.componentsDir}/${componentName}/${componentVersion}`,
                err => {
                  if (err) {
                    return callback(err);
                  }
                  componentsCache.refresh((err, componentsList) => {
                    if (err) {
                      return callback(err);
                    }
                    componentsDetails.refresh(componentsList, callback);
                  });
                }
              );
            }
          );
        }
      );
    }
  };

  return repository;
};
