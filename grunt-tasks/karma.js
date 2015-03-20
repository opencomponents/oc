'use strict';

module.exports = {
    dev: {
        configFile: 'test/configuration/karma-local.js',
        singleRun: false,
        autoWatch: true
    },
    sauce: {
        configFile: 'test/configuration/karma-sauce.js',
        singleRun: true
    },
    local: {
        configFile: 'test/configuration/karma-local.js',
        singleRun: true
    }
};