'use strict';

var express = require('express');
var http = require('http');
var https = require('https');

var config = require('./config/config');

var app = express();
var server = http.Server(app);

app.set('config', config);

// Express bootstrap
require('./config/express')(app);

// Routes bootstrap
require('./config/routes')(app);

server.listen(app.get('port'), function () {
	console.log('Node app is running on port', app.get('port'));
});
