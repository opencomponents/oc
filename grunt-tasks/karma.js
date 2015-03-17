'use strict';

module.exports = {
    options: {
        configFile: 'test/karma.conf.js'
    },
    dev: {
        singleRun: false,
        autoWatch: true
    },
    test: {
        singleRun: true
    }
};