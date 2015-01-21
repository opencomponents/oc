var task = {
    options: {
        reporter: '<%= grunt.option("mocha") || "spec" %>'
    },
    acceptance:{
        src: ['test/acceptance/**/*.js']
    },
    unit:{
        src: ['test/unit/**/*.js']
    }
};

module.exports = task;