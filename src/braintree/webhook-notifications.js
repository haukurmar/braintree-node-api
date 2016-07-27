// var prettyjson = require('prettyjson');
// var util = require('util');

function _sendEmail(app, subject, body) {
	//var notificationBody = prettyjson.render(util.inspect(body, {colors: true}));
	var notificationBody = JSON.stringify(body);
	console.log('[Webhook Received ' + notificationBody);
	var heading = '<h1>'+ subject +'</h1>';

	var mailInfo = {
		mail: {
			to: ['haukurmar@gmail.com'],
			subject: subject,
			body: heading + notificationBody
		}
	};
	//app.mailer.send(mailInfo, function (err, data, res) {
	app.mailer.send(mailInfo, function (err) {
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
	_sendEmail(app, 'Braintree Disbursement Notification', webhookNotification);
}

/**
 *
 * @param webhookNotification
 */
function handleDispute(app, webhookNotification) {
	_sendEmail(app, 'Braintree Dispute Notification', webhookNotification);
}

/**
 *
 * @param webhookNotification
 */
function handlePartnerMerchantAccount(app, webhookNotification) {
	_sendEmail(app, 'Braintree PartnerMerchantAccount Notification', webhookNotification);
}

/**
 *
 * @param webhookNotification
 */
function handleSubMerchantAccount(app, webhookNotification) {
	_sendEmail(app, 'Braintree SubMerchantAccount Notification', webhookNotification);
}

/**
 *
 * @param webhookNotification
 */
function handleSubscription(app, webhookNotification) {
	_sendEmail(app, 'Braintree Subscription Notification', webhookNotification);
}

/**
 *
 * @param webhookNotification
 */
function handleTest(app, webhookNotification) {
	_sendEmail(app, 'Braintree Test Notification', webhookNotification);
}

function handleUnknown(app, webhookNotification) {
	_sendEmail(app, 'Braintree Unknown Notification', webhookNotification);
}

exports.handleDisbursement = handleDisbursement;
exports.handleDispute = handleDispute;
exports.handlePartnerMerchantAccount = handlePartnerMerchantAccount;
exports.handleSubMerchantAccount = handleSubMerchantAccount;
exports.handleSubscription = handleSubscription;
exports.handleTest = handleTest;
exports.handleUnknown = handleUnknown;


