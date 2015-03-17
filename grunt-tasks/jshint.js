'use strict';

module.exports = {
    options: {
        jshintrc: '.jshintrc',
        ignores: [
            'node_modules', 
            'client/oc-client.min.js', 
            'components/oc-client/src/head.load.js', 
            'components/oc-client/src/oc-client.min.js', 
            'components/oc-client/_package/**/*', 
            'components/base-component-handlebars/_package/**/*',
            'components/base-components-jade/_package/**/*',
            'test/fixtures',
            'test/front-end'
        ]
    },
    all: ['.']
};