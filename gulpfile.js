'use strict';

var gelf = require('tjs-gelf');


/**
 * Task: Default.
 */
gelf.task('default', ['dump:tasks']);


/**
 * Task module: Simple browserify.
 */
gelf.load(require('./index'), 'simple', function(config) {

	config.src       = 'test/main.js';
	config.paths     = [ 'test' ];
	config.dest      = 'dist';

});


/**
 * Task module: Browserify with global shim.
 */
gelf.load(require('./index'), 'shimmed', function(config) {

	config.src       = 'test/main.js';
	config.paths     = [ 'test' ];
	config.concat    = 'with-shimmed-include.js';
	config.dest      = 'dist';
	
	config.shim = {
		'include': 'global:include'
	};

});
