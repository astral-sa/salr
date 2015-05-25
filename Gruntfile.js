module.exports = function(grunt)
{
	// load all grunt tasks matching the ['grunt-*', '@*/grunt-*'] patterns
	require('load-grunt-tasks')(grunt, {scope: ['devDependencies', 'dependencies', 'optionalDependencies']});
	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		clean: {
			main: [
				'build',
				'release',
				'salastread*.xpi'
			],
			src: ['build']
		},
		copy: {
			main: {
				files: [
					{expand: true, cwd: 'extension', src: ['salr.rdf'], dest: 'build/'},
					{expand: true, cwd: 'extension', src: ['**','!salr.rdf'], dest: 'build/src/'}
				]
			},
			update: {
				files: [
					{expand: true, cwd: 'build', src: 'salr.rdf', dest: ''}
				]
			},
			devupdate: {
				files: [
					{expand: true, cwd: 'build', src: 'salr.rdf', dest: '',
					rename: function(dest, src)
						{
							return dest + src.replace('salr','salr_dev');
						}
					}
				]
			},
		},
		sed: {
			version: {
				path: 'build/',
				pattern: '%SALR_VERSION%',
				replacement: '<%= grunt.option(\'gitRevision\') %>',
				recursive: true
			},
			updatelink: {
				path: 'build/',
				pattern: '%SALR_UPDATELINK%',
				replacement: 'https://github.com/astral-sa/salr/raw/master/salastread.xpi',
				recursive: true
			}
		},
		jshint: {
			js: {
				options: {
					jshintrc: '.jshintrc'
				},
				src: ['extension/content/**/*.js','extension/modules/*.js']
			}
		},
		"git-describe": {
			"options": {
				template: '{%=tag%}.{%=since%}'
			},
			dist: {}
		},
		compress: {
			main: {
				options: {
					archive: 'salastread_<%= grunt.option(\'gitRevision\') %>.xpi',
					mode: 'zip',
					level: 9
				},
				expand: true,
				cwd: 'build/src',
				src: ['**']
			}
		},
		bump: {
			options: {
				prereleaseName: 'beta',
				commit: true,
				commitMessage: 'Release v%VERSION%',
				commitFiles: ['package.json'],
				createTag: true,
				tagName: 'v%VERSION%',
				tagMessage: 'Version %VERSION%',
				push: false,
			}
		}
	});

	grunt.registerTask('default', ['clean:main', 'copy:main', 'saveRevision', 'sed', 'compress', 'clean:src']);
	grunt.registerTask('build', ['default']);
	grunt.registerTask('push', ['build', 'copy:update']);

	grunt.registerTask('saveRevision', function() {
		grunt.event.once('git-describe', function (rev) {
			var outString = '';
			outString += rev.tag;
			if (rev.since !== '0')
				outString += "." + rev.since;
			grunt.option('gitRevision', outString);
		});
		grunt.task.run('git-describe');
	});
};
