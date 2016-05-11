var prettyjson = require('prettyjson');
var util = require('util');

function _sendEmail(app, subject, body) {
	var notificationBody = prettyjson.render(util.inspect(body, {colors: true}));
	console.log("[Webhook Received " + notificationBody);

	var mailInfo = {
		mail: {
			to: ['haukurmar@gmail.com'],
			subject: subject,
			body: body
		}
	};
	app.mailer.send(mailInfo, function (err, data, res) {
		if (err) {
			// TODO: Log error
			console.log('Error sending email', err);
		}
	});
}

/**
 *
 * @param webhookNotification
 */
function handleDisbursement(app, webhookNotification) {
	_sendEmail(app, 'Braintree Disbursement Notification', prettyjson.render(util.inspect(webhookNotification, {colors: true})));
}

/**
 *
 * @param webhookNotification
 */
function handleDispute(app, webhookNotification) {
	_sendEmail(app, 'Braintree Dispute Notification', prettyjson.render(util.inspect(webhookNotification, {colors: true})));
}

/**
 *
 * @param webhookNotification
 */
function handlePartnerMerchantAccount(app, webhookNotification) {
	_sendEmail(app, 'Braintree PartnerMerchantAccount Notification', prettyjson.render(util.inspect(webhookNotification, {colors: true})));
}

/**
 *
 * @param webhookNotification
 */
function handleSubMerchantAccount(app, webhookNotification) {
	_sendEmail(app, 'Braintree SubMerchantAccount Notification', prettyjson.render(util.inspect(webhookNotification, {colors: true})));
}

/**
 *
 * @param webhookNotification
 */
function handleSubscription(app, webhookNotification) {
	_sendEmail(app, 'Braintree Subscription Notification', prettyjson.render(util.inspect(webhookNotification, {colors: true})));
}

/**
 *
 * @param webhookNotification
 */
function handleTest(app, webhookNotification) {
	_sendEmail(app, 'Braintree Test Notification', prettyjson.render(util.inspect(webhookNotification, {colors: true})));
}

function handleUnknown(app, webhookNotification) {
	_sendEmail(app, 'Braintree Unknown Notification', prettyjson.render(util.inspect(webhookNotification, {colors: true})));
}

exports.handleDisbursement = handleDisbursement;
exports.handleDispute = handleDispute;
exports.handlePartnerMerchantAccount = handlePartnerMerchantAccount;
exports.handleSubMerchantAccount = handleSubMerchantAccount;
exports.handleSubscription = handleSubscription;
exports.handleTest = handleTest;
exports.handleUnknown = handleUnknown;


