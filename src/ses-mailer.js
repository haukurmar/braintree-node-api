var AWS = require('aws-sdk');

/**
 * Mailer for Amazon SimpleEmailService
 * @param options
 * @constructor
 */
var SesMailer = function (options) {
	this.mailClient = new AWS.SES(options.aws);
	this.from = options.from;
};

SesMailer.prototype.send = function (options, callback) {
	var self = this;

	var params = {
		Destination: {
			ToAddresses: options.mail.to
		},
		Message: {
			Subject: {
				Data: options.mail.subject
			},
			Body: {
				Html: {
					Data: options.mail.body
				}
			}
		},
		Source: self.from,
		ReplyToAddresses: [
			self.from
		]
	};

	self.mailClient.sendEmail(params, function (err, data, res) {
		if (err) {
			// TODO: Log error
			return callback(err);
		}
	});
};

module.exports = SesMailer;
