var braintree = require('braintree');
var http = require('http');
var https = require('https');
var querystring = require('querystring');
var prettyjson = require('prettyjson');
var util = require('util');
var braintreeNotifications = require('../src/braintree/webhook-notifications');

exports = module.exports = function (app) {
	/**
	 * Instantiate your gateway (update here with your Braintree API Keys)
	 */
	// TODO: Use ENV vars for keys and move to nconf
	var gateway = braintree.connect({
		environment: braintree.Environment.Sandbox,
		merchantId: "rz68q2ywrvxwb393",
		publicKey: "j3gy6zdvqkw44bgb",
		privateKey: "85cc36287e21f4d07ad0d202fcbd4548"
	});

	function formatErrors(errors) {
		var formattedErrors = '';

		for (var i in errors) { // eslint-disable-line no-inner-declarations, vars-on-top
			if (errors.hasOwnProperty(i)) {
				formattedErrors += errors[i].code + ': ' + errors[i].message + '\n' + ' ';
			}
		}
		return formattedErrors;
	}

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
			host: app.get('host'),
			port: app.get('port'),
			method: 'POST',
			path: '/api/v1/webhooks',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(postData)
			}
		};

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
	 * Get all available subscription plans
	 */
	app.get('/api/v1/plans', function (request, response) {
		// TODO: Send email to developers if something goes wrong.

		gateway.plan.all(function (err, result) {
			if (err) {
				response.send(500, {
					status: 500,
					message: 'An error occurred creating getting subscription plans' + err
				});
			}

			response.send(200, result);

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
	app.post("/api/v1/webhooks", function (request, response) {
		gateway.webhookNotification.parse(
			request.body.bt_signature,
			request.body.bt_payload,
			function (err, webhookNotification) {
				// TODO: Handle errors

				// ----- Handle different kinds of notifications -----

				console.log('webhookNotification', webhookNotification);

				switch (webhookNotification.kind) {
				case braintree.WebhookNotification.Kind.Disbursement:
				case braintree.WebhookNotification.Kind.DisbursementException:
				case braintree.WebhookNotification.Kind.TransactionDisbursed:
					// Disbursement
					braintreeNotifications.handleDisbursement(app, webhookNotification);
					break;

				case braintree.WebhookNotification.Kind.DisputeLost:
				case braintree.WebhookNotification.Kind.DisputeOpened:
				case braintree.WebhookNotification.Kind.DisputeWon:
					// Dispute
					braintreeNotifications.handleDispute(app, webhookNotification);
					break;

				case braintree.WebhookNotification.Kind.PartnerMerchantConnected:
				case braintree.WebhookNotification.Kind.PartnerMerchantDeclined:
				case braintree.WebhookNotification.Kind.PartnerMerchantDisconnected:
					// Partner Merchant Account
					braintreeNotifications.handlePartnerMerchantAccount(app, webhookNotification);
					break;

				case braintree.WebhookNotification.Kind.SubMerchantAccountApproved:
				case braintree.WebhookNotification.Kind.SubMerchantAccountDeclined:
					// Sub Merchant Account
					braintreeNotifications.handleSubMerchantAccount(app, webhookNotification);
					break;

				case braintree.WebhookNotification.Kind.SubscriptionCanceled:
				case braintree.WebhookNotification.Kind.SubscriptionChargedSuccessfully:
				case braintree.WebhookNotification.Kind.SubscriptionChargedUnsuccessfully:
				case braintree.WebhookNotification.Kind.SubscriptionExpired:
				case braintree.WebhookNotification.Kind.SubscriptionTrialEnded:
				case braintree.WebhookNotification.Kind.SubscriptionWentActive:
				case braintree.WebhookNotification.Kind.SubscriptionWentPastDue:
					// Subscription
					braintreeNotifications.handleSubscription(app, webhookNotification);
					break;

				case braintree.WebhookNotification.Kind.Check:
					// Test
					braintreeNotifications.handleTest(app, webhookNotification);
					break;

				default:
					braintreeNotifications.handleUnknown(app, webhookNotification)
				}
			}
		);
		response.send(200);
	});

	app.post("/api/v1/customers", function (request, response) {
		var customer = {
			id: request.body.id,
			firstName: request.body.firstName,
			lastName: request.body.lastName,
			email: request.body.email
			// creditCard: {
			// 	number: request.body.number,
			// 	cvv: request.body.cvv,
			// 	expirationMonth: request.body.month,
			// 	expirationYear: request.body.year,
			// 	billingAddress: {
			// 		postalCode: request.body.postal_code
			// 	}
			// }
		};

		gateway.customer.create(customer, function (err, result) {
			if (err) {
				response.send(500, {
					status: 500,
					message: 'An error occurred creating a customer' + err
				});
			}

			if (result.success) {
				response.send(200, {
					success: true,
					status: 200,
					customer: result.customer
				});

				// If we want to generate a clientToken
				// var newCustomer = result.customer;
				// gateway.clientToken.generate({
				// 	customerId: result.customer.id
				// }, function (err, tokenResponse) {
				// 	newCustomer.clientToken = tokenResponse.clientToken;
				//
				// 	response.send(200, {
				// 		success: true,
				// 		status: 200,
				// 		customer: newCustomer
				// 	});
				// });
			} else {
				// Validation errors
				var deepErrors = result.errors.deepErrors();
				var errorMessage = formatErrors(deepErrors);

				response.send(400, {
					success: false,
					status: 400,
					message: errorMessage,
					errors: deepErrors
				});

			}
		});
	});

	app.get('/api/v1/customers/:id', function(request, response) {
		var customerId = request.params.id;

		gateway.customer.find(customerId, function(err, customer) {
			if(err) {
				if(err.name === 'notFoundError') {
					response.send(404, {
						success: false,
						status: 404,
						message: 'Customer ' + err.message
					});
				} else {
					response.send(400, {
						success: false,
						status: 400,
						message: err.message
					});
				}
			} else {
				// Send customer object as a response
				response.send(200, {
					success: true,
					status: 200,
					customer: customer
				});
			}
		});
	});

	/**
	 * To create a new payment method for an existing customer,
	 * the only required attributes are the customer ID and payment method nonce.
	 */
	// TODO: Add options: {makeDefault: true}
	app.post("/api/v1/paymentmethods", function (request, response) {
		var data = {
			customerId: request.body.customerId,
			paymentMethodNonce: request.body.paymentMethodNonce,
			options: {
				verifyCard: true
			}
		};

		gateway.paymentMethod.create(data, function (err, result) {
			if (err) {
				response.send(500, {
					status: 500,
					message: 'An error occurred creating a payment method' + err
				});
			}

			if (result.success) {
				console.log('PaymentMethod result', result);
				response.send(200, {
					success: true,
					status: 200,
					customer: result
				});
			} else {
				// Validation errors
				var deepErrors = result.errors.deepErrors();
				var errorMessage = formatErrors(deepErrors);

				response.send(400, {
					success: false,
					status: 400,
					message: errorMessage,
					errors: deepErrors
				});
			}
		});

	});

	app.post("/api/v1/subscriptions", function (request, response) {
		var subscription = {
			paymentMethodToken: request.body.paymentMethodToken,
			planId: request.body.planId
		};

		gateway.subscription.create(subscription, function (err, result) {
			if (err) {
				response.send(500, {
					status: 500,
					message: 'An error occurred creating a subscription' + err
				});
			}

			if (result.success) {
				response.send(200, {
					success: true,
					status: 200,
					subscription: result
				});
			} else {
				// Validation errors
				var deepErrors = result.errors.deepErrors();
				var errorMessage = formatErrors(deepErrors);

				response.send(400, {
					success: false,
					status: 400,
					message: errorMessage,
					errors: deepErrors
				});

			}
		});
	});
};
