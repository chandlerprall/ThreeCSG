module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    availabletasks: {
     all: { exclude: [] } 
    },
    bump: {
      options: {
        files: ['bower.json', 'package.json'],
        updateConfigs: [],
        commit: true,
        commitMessage: 'Release v%VERSION%',
        commitFiles: ['bower.json', 'package.json'],
        createTag: true,
        tagName: 'v%VERSION%',
        tagMessage: 'Version %VERSION%',
        push: true,
        pushTo: 'upstream',
        gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
        globalReplace: false
      }
    },
    clean: {
      dist: [ 'dist/**/*' ]
    },
    copy: {
      dist: {
        files: [
          { cwd: 'src', src: ['**/*'], dest: 'dist/', expand: true }
        ]
      }
    },
    jshint: {
      src: [ 'src/**/*.js' ] 
    },
    uglify: {
      build: {
        src: 'src/<%= pkg.name %>.js',
        dest: 'dist/<%= pkg.name %>.min.js'
      }
    }
  });

  // Load plugins
  grunt.loadNpmTasks('grunt-available-tasks');
  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // Define task(s)
  grunt.registerTask('default', ['availabletasks']);
  grunt.registerTask('build', ['jshint','clean','copy','uglify']);
};
