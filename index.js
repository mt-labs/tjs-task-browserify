'use strict';

module.exports = function (gelf, name) {

	// Module name
	name = name || 'scripts';

	// Task names
	var task = {
		build:  'build:' + name,
		watch:  'watch:' + name,
	};


	/**
	 * Default configuration.
	 */
	gelf.config(name, function (config, get) {

		var isProd = (get('env') === 'prod');

		return {
			src: 'app/Resources/scripts/main.js',
			paths: null,
			concat: null,
			dest: 'web/js',
			shim: null,
			watch: get('watch'),
			uglify: isProd,
		};

	});


	/**
	 * Starts a timer that logs the start and end times of the task.
	 */
	function taskTimer() {

		var gutil = require('gulp-util');
		var prettyTime = require('pretty-hrtime');

		var start = process.hrtime();

		gutil.log('Starting', '\'' + gutil.colors.cyan(task.build) + '\'...');

		return function () {
			var time = prettyTime(process.hrtime(start));
			gutil.log(
				'Finished', '\'' + gutil.colors.cyan(task.build) + '\'',
				'after', gutil.colors.magenta(time)
			);
		};

	}


	/**
	 * Initialises a browserify/watchify instance.
	 */
	function init(isWatching) {

		var config = gelf.config(name);

		var opts = {
			entries: config.src,
			debug: true,
		};

		if (config.paths) {
			opts.paths = config.paths;
		}

		if (isWatching) {
			opts.cache = {};
			opts.packageCache = {};
		}

		var browserify = require('browserify');
		var b = browserify(opts);

		if (config.shim) {
			b.transform(require('browserify-shim'), {
				shim: config.shim
			});
		}

		if (isWatching) {
			b.plugin(require('watchify'), {
				delay:        config.watch.debounce,
				ignoreWatch:  true,
				poll:         config.watch.usePolling ? config.watch.interval : false
			});
			b.on('update', bundle.bind(null, false, true));
		}

		function bundle(earlyExit, forceLogging) {

			var buffer = require('vinyl-buffer');
			var gutil = require('gulp-util');
			var source = require('vinyl-source-stream');
			var sourcemaps = require('gulp-sourcemaps');

			var bundleName = config.concat;
			if (bundleName == null) {
				var path = require('path');
				bundleName = path.basename(Array.isArray(config.src) ? config.src[0] : config.src);
				bundleName = gutil.replaceExtension(bundleName, '.js');
			}

			var stream = b.bundle()
				.pipe(source(bundleName))
			;

			if (earlyExit) {
				return stream;
			}

			stream = stream
				.pipe(buffer())
				.pipe(sourcemaps.init({loadMaps: true}))
				.pipe(sourcemaps.write('./'))
				.pipe(gelf.dest(config.dest))
			;

			if (forceLogging) {
				stream.on('finish', taskTimer());
			}

			return stream;

		}

		return bundle(isWatching, false);

	}


	/**
	 * Task: Build scripts.
	 */
	gelf.task(task.build, function () {

		return init(false);

	});


	/**
	 * Task: Watch scripts.
	 */
	gelf.task(task.watch, function () {

		return init(true);

	});


	return name;

};
