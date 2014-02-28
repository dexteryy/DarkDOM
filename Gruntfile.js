
module.exports = function(grunt) {

    var pkg = grunt.file.readJSON('package.json');

    grunt.initConfig({
        pkg: pkg,

        jsdoc : {
            dist : {
                src: ['darkdom.js', 'README.md'], 
                options: {
                    configure: 'jsdoc.json',
                    template: 'node_modules/ink-docstrap/template',
                    destination: 'doc'
                }
            }
        },

        watch: {
            jsdoc: {
                files: [
                    'darkdom.js',
                    'README.md',
                    'jsdoc.json'
                ],
                tasks: [
                    'jsdoc'
                ],
            },
        }

    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-jsdoc');

    grunt.registerTask('default', [
        'jsdoc'
    ]);

};
