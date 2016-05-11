var Mailer = require('./ses-mailer');

/*!
 * Exports a function which extends the app with an instance of the mailer.
 *
 * @api public
 */

module.exports = function(app, config) {
	if (app.mailer) {
		throw new Error('Application has already been extended with mailer');
	}

	app.mailer = new Mailer({
		aws: config.aws,
		from: config.from
	});
};
