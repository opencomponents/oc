'use strict';

module.exports = {
    options: {
        jshintrc: '.jshintrc',
        ignores: [
        'node_modules', 
        'components/oc-client/src/handlebars.1.3.0.js', 
        'components/oc-client/src/oc-client.min.js', 
        'components/oc-client/_package/**/*', 
        'components/base-component-handlebars/_package/**/*',
        'components/base-components-jade/_package/**/*',
        'test/fixtures']
    },
    all: ['.']
};