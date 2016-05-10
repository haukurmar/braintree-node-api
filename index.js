'use strict';

var util = require('util');
var express = require('express');
var braintree = require('braintree');
var bodyParser = require('body-parser');
var SesMailer = require('./src/ses-mailer');

/**
 * Instantiate your server and a JSON parser to parse all incoming requests
 */
var app = express();
app.set('port', (process.env.PORT || 5000));

var jsonParser = bodyParser.json();

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

var mailer = new SesMailer(mailerConfig);

/**
 * Instantiate your gateway (update here with your Braintree API Keys)
 */
var gateway = braintree.connect({
	environment: braintree.Environment.Sandbox,
	merchantId: "rz68q2ywrvxwb393",
	publicKey: "j3gy6zdvqkw44bgb",
	privateKey: "85cc36287e21f4d07ad0d202fcbd4548"
});

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

app.get('/api/v1/samplenotification', function (request, response) {
	var sampleNotification = gateway.webhookTesting.sampleNotification(
		braintree.WebhookNotification.Kind.SubscriptionWentPastDue,
		"myId"
	);

	gateway.webhookNotification.parse(
		sampleNotification.bt_signature,
		sampleNotification.bt_payload,
		function (err, webhookNotification) {
			webhookNotification.subscription.id
			console.log('webhookNotification.subscription.id', webhookNotification.subscription.id);
			// "myId"
		}
	);

	response.send(200);
});

/**
 * Route that returns a token to be used on the client side to tokenize payment details
 */
app.get('/api/v1/token', function (request, response) {
	gateway.clientToken.generate({}, function (err, res) {
		if (err) throw err;
		response.json({
			"client_token": res.clientToken
		});
	});
});

/**
 * Route to process a sale transaction
 */
app.post('/api/v1/process', jsonParser, function (request, response) {
	var transaction = request.body;
	gateway.transaction.sale({
		amount: transaction.amount,
		paymentMethodNonce: transaction.payment_method_nonce
	}, function (err, result) {
		if (err) throw err;
		console.log(util.inspect(result));
		response.json(result);
	});
});

app.post("/api/v1/webhooks", function (req, res) {
	gateway.webhookNotification.parse(
		req.body.bt_signature,
		req.body.bt_payload,
		function (err, webhookNotification) {
			//webhookNotification.kind
			// "subscriptionWentPastDue"

			//webhookNotification.timestamp
			// Sun Jan 1 00:00:00 UTC 2012

			//webhookNotification.subscription.id
			// "subscription_id"

			console.log("[Webhook Received " + webhookNotification.timestamp + "] | Kind: " + webhookNotification.kind + " | Subscription: " + webhookNotification.subscription.id);

			var mailInfo = {
				mail: {
					to: ['haukurmar@gmail.com'],
					subject: 'Webhook notification',
					body: "[Webhook Received " + webhookNotification.timestamp + "] | Kind: " + webhookNotification.kind + " | Subscription: " + webhookNotification.subscription.id
				}
			};

			mailer.send(mailInfo, function (err, data, res) {
				if (err) {
					console.log('Error sending email', err);
					//return response.send(500);
				}
			});
		}
	);
	res.send(200);
});

app.listen(app.get('port'), function () {
	console.log('Node app is running on port', app.get('port'));
});
