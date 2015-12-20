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
				replacement: 'https://github.com/astral-sa/salr/releases/download/<%= pkg.version %>/salastread_v<%= pkg.version %>_signed.xpi',
				recursive: true
			},
			threadlink: {
				path: 'build/',
				pattern: '%SALR_THREADLINK%',
				replacement: 'http://forums.somethingawful.com/showthread.php?threadid=2571027&goto=lastpost',
				recursive: true
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
					archive: 'salastread_v<%= grunt.option(\'gitRevision\') %>.xpi',
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
				commitMessage: 'Bump version to v%VERSION%',
				commitFiles: ['package.json'],
				createTag: true,
				tagName: '%VERSION%',
				tagMessage: 'SALR Version %VERSION%',
				push: true,
				pushTo: 'origin',
			}
		},
		'github-release': {
			options: {
				auth: grunt.file.readJSON('../gh-cred.json'),
				repository: 'astral-sa/salr',
			},
			rel: {
				options: {
					release: {
						name: 'v<%= pkg.version %>',
						body: 'SALR version <%= pkg.version %>',
						prerelease: false
					}
				},
				'src': ['salastread_v*_signed.xpi']
			},
			pre: {
				options: {
					release: {
						name: 'v<%= pkg.version %>',
						body: 'SALR development version <%= pkg.version %>',
						prerelease: true
					}
				},
				'src': ['salastread_v*_signed.xpi']
			}
		}
	});

	grunt.registerTask('default', ['build', 'clean:src']);
	grunt.registerTask('build', ['clean:main', 'copy:main', 'saveRevision', 'sed', 'compress', 'copy:update']);
	grunt.registerTask('rel', ['github-release:rel']);
	grunt.registerTask('pre', ['github-release:pre']);

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
