var braintree = require('braintree');
var braintreeApi = require('../src/braintree/braintree-api');
var braintreeNotifications = require('../src/braintree/webhook-notifications');
var querystring = require('querystring');
var http = require('http');

exports = module.exports = function (app) {
	/**
	 * Instantiate your gateway (update here with your Braintree API Keys)
	 */
		// TODO: Use ENV vars for keys and move to nconf
	var gateway = braintree.connect({
		environment: braintree.Environment.Sandbox,
		merchantId: 'rz68q2ywrvxwb393',
		publicKey: 'j3gy6zdvqkw44bgb',
		privateKey: '85cc36287e21f4d07ad0d202fcbd4548'
	});


	app.get('/api/v1/webhooktest/:type/:subId', function (request, response) {
		var webhookType = request.params.type;
		var subscriptionId = request.params.subId;
		var sampleNotification = gateway.webhookTesting.sampleNotification(
			webhookType,
			subscriptionId
		);

		// form data
		var postData = querystring.stringify({
			bt_signature: sampleNotification.bt_signature,
			bt_payload: sampleNotification.bt_payload
		});

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
			});
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
	 * Create a new customer
	 */
	app.post('/api/v1/customers', braintreeApi.createCustomer);

	/**
	 * Get a specific customer
	 */
	app.get('/api/v1/customers/:id', braintreeApi.getCustomer);

	/**
	 * Get customer with all subscriptions, including plan details
	 * // TODO: Return paymentMethod with each subscription
	 */
	app.get('/api/v1/customers/:id/subscriptions', braintreeApi.getCustomerWithSubscriptionDetails);

	/**
	 * Route that returns a token to be used on the client side to tokenize payment details
	 */
	app.get('/api/v1/token', braintreeApi.getClientToken);

	/**
	 * To create a new payment method for an existing customer,
	 * the only required attributes are the customer ID and payment method nonce.
	 */
	app.post('/api/v1/paymentmethods', braintreeApi.createPaymentMethod);

	/**
	 * Get all available subscription plans
	 */
	app.get('/api/v1/plans', braintreeApi.getSubscriptionPlans);

	/**
	 * Route to process a sale transaction
	 */
	app.post('/api/v1/process', braintreeApi.processSaleTransaction);

	/**
	 * Delete a specific payment method
	 */
	app.delete('/api/v1/paymentmethods/:token', braintreeApi.deletePaymentMethod);

	/**
	 * Create a new subscription for customer
	 */
	app.post('/api/v1/subscriptions', braintreeApi.createSubscription);

	/**
	 * Retry a transaction for a subscription
	 */
	app.post('/api/v1/subscriptions/:id/retry', braintreeApi.retrySubscriptionCharge);

	/**
	 * Update a subscription for customer
	 */
	app.put('/api/v1/subscriptions', braintreeApi.updateSubscription);

	/**
	 * Cancel a specific subscription
	 */
	app.delete('/api/v1/subscriptions/:id', braintreeApi.cancelSubscription);

	/**
	 * Webhooks to get notified from Braintree gateway
	 * Expects a x-www-form-urlencoded request
	 */
	app.post('/api/v1/webhooks', webHooks);

	/**
	 * Webhooks to get notified from Braintree gateway
	 * Expects a x-www-form-urlencoded request
	 * @param request
	 * @param response
	 */
	function webHooks(request, response) {
		gateway.webhookNotification.parse(
			request.body.bt_signature,
			request.body.bt_payload,
			function (err, webhookNotification) {
				// TODO: Handle errors

				// ----- Handle different kinds of notifications -----

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
					braintreeNotifications.handleUnknown(app, webhookNotification);
				}
			}
		);
		return response.send(200);
	}
};
