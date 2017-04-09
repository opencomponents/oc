'use strict';

const babel = require('babel-core');
const babelPresetEnv = require('babel-preset-env');
const CleanCss = require('clean-css');
const uglifyJs = require('uglify-js');

module.exports = function(fileExt, fileContent){

  if(fileExt === '.js'){

    const presetOptions = {
      targets: {
        browsers: 'ie 8',
        uglify: true
      },
      useBuiltIns: true,
      modules: false
    };

    const babelOptions = { presets: [[babelPresetEnv, presetOptions]] },
      es5 = babel.transform(fileContent, babelOptions).code;

    return uglifyJs.minify(es5, { fromString: true }).code;

  } else if(fileExt === '.css'){

    return new CleanCss().minify(fileContent).styles;
  }
};
