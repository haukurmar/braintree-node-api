var nconf = require('nconf');
var path = require('path');
var rootPath = path.normalize(__dirname + '/../');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

/*
 * Configuration priority:
 * 1. Command-line arguments
 * 2. Configuration file
 * 3. Defaults
 */

nconf.env({
	separator: '__'
});
nconf.argv();
nconf.file(__dirname + '/env/' + process.env.NODE_ENV + '.json');

nconf.defaults({
	'root': rootPath,
	'environment': process.env.NODE_ENV
});

module.exports = nconf.get();
