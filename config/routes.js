var braintree = require('braintree');
var http = require('http');
var https = require('https');
var querystring = require('querystring');
var prettyjson = require('prettyjson');
var util = require('util');

exports = module.exports = function (app) {
	/**
	 * Instantiate your gateway (update here with your Braintree API Keys)
	 */
	// TODO: Use ENV vars for keys
	var gateway = braintree.connect({
		environment: braintree.Environment.Sandbox,
		merchantId: "rz68q2ywrvxwb393",
		publicKey: "j3gy6zdvqkw44bgb",
		privateKey: "85cc36287e21f4d07ad0d202fcbd4548"
	});

	app.get('/api/v1/samplenotification', function (request, response) {
		var sampleNotification = gateway.webhookTesting.sampleNotification(
			braintree.WebhookNotification.Kind.SubscriptionWentPastDue,
			"myId"
		);

		console.log('SampleNotification: ', sampleNotification);

		// form data
		var postData = querystring.stringify({
			bt_signature: sampleNotification.bt_signature,
			bt_payload: sampleNotification.bt_payload
		});

		console.log('PostData', postData);

		// request option
		var options = {
			//host: 'https://haukurmar-braintree-node-api.herokuapp.com',
			host: app.get('host'),
			port: app.get('port'),
			method: 'POST',
			path: '/api/v1/webhooks',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(postData)
			}
		};

		// TODO: find a better solution
		var httpProtocol = https;
		if (process.ENV === 'development') {
			httpProtocol = http;
		}

		var result = '';
		// // request object
		var req = http.request(options, function (res) {
			res.on('data', function (chunk) {
				console.log('on data', chunk);
				result += chunk;
			});
			res.on('end', function () {
				console.log(result);
			});
			res.on('error', function (err) {
				console.log(err);
			})
		});

		// req error
		req.on('error', function (err) {
			console.log('ERROR making a request:', err);
		});

		//send request with the postData form
		req.write(postData);
		req.end();

		response.send(result);
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
	app.post('/api/v1/process', function (request, response) {
		var transaction = request.body;
		gateway.transaction.sale({
			amount: transaction.amount,
			paymentMethodNonce: transaction.payment_method_nonce
		}, function (err, result) {
			if (err) throw err;
			console.log(util.inspect(result));

			var mailInfo = {
				mail: {
					to: ['haukurmar@gmail.com'],
					subject: 'Payment notification',
					body: 'Payment going through: ' + util.inspect(result)
				}
			};

			app.mailer.send(mailInfo, function (err, data, res) {
				if (err) {
					console.log('Error sending email', err);
				}
			});

			response.json(result);
		});
	});

	/**
	 * Expects a x-www-form-urlencoded request
	 */
	app.post("/api/v1/webhooks", function (req, res) {
		console.log('req.body', req.body);
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

				var notificationBody = prettyjson.render(util.inspect(webhookNotification, {colors: true}));
				console.log("[Webhook Received " + notificationBody);

				var mailInfo = {
					mail: {
						to: ['haukurmar@gmail.com'],
						subject: 'Webhook notification',
						body: "[Webhook Received " + notificationBody
					}
				};

				app.mailer.send(mailInfo, function (err, data, res) {
					if (err) {
						console.log('Error sending email', err);
						//return response.send(500);
					}
				});
			}
		);
		res.send(200);
	});
};