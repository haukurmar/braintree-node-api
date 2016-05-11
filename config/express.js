var bodyParser = require('body-parser');

exports = module.exports = function (app) {
	var port = process.env.PORT || 5000;

	/**
	 * Instantiate your server and a JSON parser to parse all incoming requests
	 */
	app.set('port', (port));

	app.use(bodyParser.urlencoded({
		limit: '2mb',
		extended: true
	}));

	app.use(bodyParser.json({
		limit: '2mb'
	}));

	/**
	 * Enable CORS (http://enable-cors.org/server_expressjs.html)
	 * to allow different clients to request data from your server
	 */
	app.use(function (req, res, next) {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
		res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
		next();
	});

	// Mailer

	// TODO: use nconf
	var mailerConfig = {
		from: "Braintree API <haukurmar@gmail.com>",
		aws: {
			region: "eu-west-1",
			accessKeyId: process.env.AWS_ACCESSKEY_ID,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
			sslEnabled: true
		}
	};

	require('../src/mailer')(app, mailerConfig);
};

