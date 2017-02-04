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
	 * Nicely formats an error message (taken from gulp.js source).
	 */
	function formatError(e) {
		
		if (!e.err) {
			return e.message;
		}
		
		if (e.err.message) {
			return e.err.message;
		}
		
		return JSON.stringify(e.err);
		
	}


	/**
	 * Gets a task logger instance.
	 */
	function getLogger(taskName) {
		
		var gutil = require('gulp-util');
		var prettyTime = require('pretty-hrtime');
		
		var startTime = process.hrtime();
		
		function start() {
			
			startTime = process.hrtime();
			gutil.log('Starting', '\'' + gutil.colors.cyan(taskName) + '\'...');
			
		}
		
		function stop() {
			
			var time = prettyTime(process.hrtime(startTime));
			gutil.log(
				'Finished', '\'' + gutil.colors.cyan(taskName) + '\'',
				'after', gutil.colors.magenta(time)
			);
			
		}
		
		function error(e) {
			
			var msg = formatError(e);
			var time = prettyTime(process.hrtime(startTime));

			gutil.log(
				'\'' + gutil.colors.cyan(taskName) + '\'',
				'errored after',
				gutil.colors.magenta(time),
				gutil.colors.red(msg)
			);

			gelf.notify.error(e);
			
		}
		
		return {
			start: start,
			stop:  stop,
			error: error
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
			var uglify = require('gulp-uglify');

			var bundleName = config.concat;
			if (bundleName == null) {
				var path = require('path');
				bundleName = path.basename(Array.isArray(config.src) ? config.src[0] : config.src);
				bundleName = gutil.replaceExtension(bundleName, '.js');
			}

			var log = getLogger(task.build);

			var stream = b.bundle()
				.on('error', function(e) {
					log.error(e);
					this.emit('end');
				})
				.pipe(source(bundleName))
			;

			if (earlyExit) {
				return stream;
			}

			log.start();

			stream = stream
				.pipe(buffer())
				.pipe(sourcemaps.init({loadMaps: true}))
				.pipe(config.uglify ? uglify() : gutil.noop())
				.pipe(sourcemaps.write('./'))
				.pipe(gelf.dest(config.dest))
				.pipe(gelf.notify.done(task.build))
			;

			if (forceLogging) {
				stream.on('finish', log.stop);
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
