/* eslint-disable no-console */
var gulp = require('gulp');
var runSequence = require('run-sequence');
var conventionalChangelog = require('gulp-conventional-changelog');
var release = require('gulp-github-release');
var bump = require('gulp-bump');
var gutil = require('gulp-util');
var git = require('gulp-git');
var fs = require('fs');
var replace = require('gulp-replace');
var zip = require('gulp-zip');
var del = require('del');

function getPackageJsonVersion() {
	return JSON.parse(fs.readFileSync('./package.json', 'utf8')).version;
}

var config = {
	version: getPackageJsonVersion(),
	threadLink: 'https://forums.somethingawful.com/showthread.php?threadid=3760555&goto=lastpost',
	cred: ''
//	production: !!gutil.env.production
};
//console.log(util.env.production);

function getUpdateLink() {
	return 'https://github.com/astral-sa/salr/releases/download/' + config.version + '/salastread_v' + config.version + '_signed.xpi';
}

gulp.task('clean', () => {
	return del([
		'./salastread*.xpi'
	]);
});

// Split out install.rdf from here if we want a separate dev channel.
gulp.task('xpi', () => {
	gulp.src(['extension/**/!(salr.rdf|.eslintrc.json|jsconfig.json)'])
		.pipe(replace('%SALR_VERSION%', config.version, {skipBinary: true}))
		.pipe(replace('%SALR_UPDATELINK%', getUpdateLink(), {skipBinary: true}))
		.pipe(replace('%SALR_THREADLINK%', config.threadLink, {skipBinary: true}))
		.pipe(zip('salastread_v' + config.version + '.xpi'))
		.pipe(gulp.dest('./'));
});

gulp.task('rdf', () => {
	gulp.src(['extension/salr.rdf'])
		.pipe(replace('%SALR_VERSION%', config.version, {skipBinary: true}))
		.pipe(replace('%SALR_UPDATELINK%', getUpdateLink(), {skipBinary: true}))
		.pipe(replace('%SALR_THREADLINK%', config.threadLink, {skipBinary: true}))
		.pipe(gulp.dest('./'));
});

gulp.task('build', (callback) => {
	runSequence('clean',
				'xpi',
				callback);
});

function bumpVersion(bumpType) {
	return gulp.src('./package.json')
		.pipe(bump({type: bumpType, preid: 'dev'}).on('error', gutil.log))
		.pipe(gulp.dest('./'));
}

gulp.task('bump', () => {
	return bumpVersion('patch');
});

gulp.task('bump:minor', () => {
	return bumpVersion('minor');
});

gulp.task('bump:major', () => {
	return bumpVersion('major');
});

gulp.task('bump:pre', () => {
	return bumpVersion('prerelease');
});

gulp.task('bump:preminor', () => {
	return bumpVersion('preminor');
});

gulp.task('bump:premajor', () => {
	return bumpVersion('preminor');
});

gulp.task('changelog', function () {
	return gulp.src('CHANGELOG.md', {
		buffer: false
	})
	.pipe(conventionalChangelog({
		preset: 'eslint'
	}))
	.pipe(gulp.dest('./'));
});

function makeRelease(preRel) {
	var version = getPackageJsonVersion();
	return fs.stat('../gh-cred.json', function(err, stat) {
		if (err == null) {
			//console.log('File exists');
			config.cred = JSON.parse(fs.readFileSync('../gh-cred.json', 'utf8')).user;
			gulp.src('./salastread_v*_signed.xpi')
				.pipe(release({
				token: config.cred,
				tag: version,
				name: 'v' + version,
				notes: 'SALR version ' + version,
				draft: false,
				prerelease: preRel,
				manifest: require('./package.json')
			}));
		} else {
			console.log(err.code);
			config.cred = '';
		}
	});
}

gulp.task('rel', function() {
	return makeRelease(false);
});

gulp.task('pre', function() {
	return makeRelease(true);
});

gulp.task('commit-changes', function () {
	return gulp.src('.')
		.pipe(git.add())
		.pipe(git.commit('Bumped version number to ' + getPackageJsonVersion()));
});

gulp.task('push-changes', function (cb) {
	git.push('origin', 'master', cb);
});

gulp.task('tag', function (cb) {
	var version = getPackageJsonVersion();
	git.tag(version, 'SALR version ' + version, function (error) {
		if (error) {
			return cb(error);
		}
		git.push('origin', 'master', {args: '--tags'}, cb);
	});
});

/*
gulp.task('release', function (callback) {
  runSequence(
    'changelog',
    'commit-changes',
    'push-changes',
    'tag',
    'rel',
    function (error) {
      if (error) {
        console.log(error.message);
      } else {
        console.log('RELEASE FINISHED SUCCESSFULLY');
      }
      callback(error);
    });
});
*/

gulp.task('default', ['build']);
