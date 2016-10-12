var braintree = require('braintree');
var _ = require('underscore-node');

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

function formatErrors(deepErrors) {
	var formattedErrors = '';

	for (var i in deepErrors) { // eslint-disable-line no-inner-declarations, vars-on-top
		if (deepErrors.hasOwnProperty(i)) {
			formattedErrors += deepErrors[i].code + ': ' + deepErrors[i].message + '\n' + ' ';
		}
	}
	return formattedErrors;
}

/**
 * Cancel a specific subscription
 * @param request
 * @param response
 */
function cancelSubscription(request, response) {
	var subscriptionId = request.params.id;

	gateway.subscription.cancel(subscriptionId, function (err, result) {
		if (err) {
			return response.send(500, {
				status: 500,
				message: 'An error occurred cancelling a subscription' + err
			});
		}

		else if (result.success) {
			return response.send(200, {
				success: true,
				status: 200,
				subscription: result
			});
		} else {
			// Validation errors
			var deepErrors = result.errors.deepErrors();
			var errorMessage;

			if (deepErrors.length) {
				errorMessage = formatErrors(deepErrors);
			} else {
				errorMessage = result.message;
			}

			return response.send(400, {
				success: false,
				status: 400,
				message: errorMessage,
				errors: deepErrors
			});
		}
	});
}

/**
 * Create a new customer
 * @param request
 * @param response
 */
function createCustomer(request, response) {
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
			return response.send(500, {
				status: 500,
				message: 'An error occurred creating a customer' + err
			});
		}

		else if (result.success) {
			return response.send(200, {
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
			var errorMessage;

			if (deepErrors.length) {
				errorMessage = formatErrors(deepErrors);
			} else {
				errorMessage = result.message;
			}

			return response.send(400, {
				success: false,
				status: 400,
				message: errorMessage,
				errors: deepErrors
			});
		}
	});
}

/**
 * To create a new payment method for an existing customer,
 * the only required attributes are the customer ID and payment method nonce.
 * @param request
 * @param response
 */
function createPaymentMethod(request, response) {
	// TODO: Add options: {makeDefault: true}

	var data = {
		customerId: request.body.customerId,
		paymentMethodNonce: request.body.paymentMethodNonce,
		options: {
			verifyCard: true,
			verificationMerchantAccountId: request.body.verificationMerchantAccountId
			//failOnDuplicatePaymentMethod: true
		}
	};

	gateway.paymentMethod.create(data, function (err, result) {
		if (err) {
			return response.send(500, {
				status: 500,
				message: 'An error occurred creating a payment method' + err
			});
		}

		else if (result.success) {
			return response.send(200, {
				success: true,
				status: 200,
				customer: result
			});
		} else {
			// Validation errors
			var deepErrors = result.errors.deepErrors();
			var errorMessage;

			if (deepErrors.length) {
				errorMessage = formatErrors(deepErrors);
			} else {
				errorMessage = result.message;
			}

			return response.send(400, {
				success: false,
				status: 400,
				message: errorMessage,
				errors: deepErrors
			});
		}
	});
}

/**
 * Create a new subscription for customer
 * @param request
 * @param response
 */
function createSubscription(request, response) {
	var subscription = request.body.subscription;

	gateway.subscription.create(subscription, function (err, result) {
		if (err) {
			return response.status(500).send({
				status: 500,
				message: 'An error occurred creating a subscription' + err
			});
		}

		else if (result.success) {
			return response.status(200).send(result);
		} else {
			// Validation errors
			var deepErrors = result.errors.deepErrors();
			var errorMessage;

			if (deepErrors.length) {
				errorMessage = formatErrors(deepErrors);
			} else {
				errorMessage = result.message;
			}

			var transaction;
			if (result.transaction) {
				transaction = result.transaction;
			}

			return response.status(400).send({
				success: false,
				status: 400,
				message: errorMessage,
				errors: deepErrors,
				transaction: transaction
			});
		}
	});
}

/**
 * Delete a specific payment method
 * @param request
 * @param response
 */
function deletePaymentMethod(request, response) {
	var paymentMethodToken = request.params.token;

	gateway.paymentMethod.delete(paymentMethodToken, function (err) {
		if (err) {
			return response.send(500, {
				status: 500,
				message: 'An error occurred deleting a payment method' + err
			});
		} else {
			return response.send(200, {
				success: true,
				status: 200
			});
		}

	});
}

/**
 * Get a specific customer
 * @param request
 * @param response
 */
function getCustomer(request, response) {
	var customerId = request.params.id;

	gateway.customer.find(customerId, function (err, customer) {
		if (err) {
			if (err.name === 'notFoundError') {
				return response.send(404, {
					success: false,
					status: 404,
					message: 'Customer ' + err.message
				});
			} else {
				return response.send(400, {
					success: false,
					status: 400,
					message: err.message
				});
			}
		} else {
			// Send customer object as a response
			return response.send(200, {
				success: true,
				status: 200,
				customer: customer
			});
		}
	});
}

/**
 * Get customer with all subscriptions, including plan details
 * // TODO: Return paymentMethod with each subscription
 * @param request
 * @param response
 */
function getCustomerWithSubscriptionDetails(request, response) {
	var customerId = request.params.id;

	function copyPaymentMethodsWithoutSubscriptions(obj) {
		var newArray = [];
		_.each(obj, function (item) {
			var newItem = JSON.parse(JSON.stringify(item));
			delete newItem.subscriptions;
			newArray.push(newItem);
		});

		return newArray;
	}

	gateway.customer.find(customerId, function (err, customer) {
		if (err) {
			if (err.name === 'notFoundError') {
				return response.send(404, {
					success: false,
					status: 404,
					message: 'Customer ' + err.message
				});
			} else {
				return response.send(400, {
					success: false,
					status: 400,
					message: err.message
				});
			}
		}

		// If a customer has payment methods stored in the vault
		else if (customer.paymentMethods && customer.paymentMethods.length > 0) {
			customer.subscriptions = [];
			var customerPaymentMethods = customer.paymentMethods;
			var subscriptionPlans = [];

			// Get all subscription plans with details (name/description etc.)
			gateway.plan.all(function (err, results) {
				if (err) {
					// TODO: Handle errors
					console.log('Error fetching plans', err);
				}

				// TODO: Handle if results.success is not true?

				// Add plans to plans array
				_.each(results.plans, function (plan) {
					subscriptionPlans.push(plan);
				});

				// Copy paymentMethods array without subscriptions
				var customerPaymentMethodsWithoutSubscriptions = copyPaymentMethodsWithoutSubscriptions(customerPaymentMethods);

				// Loop through each paymentMethod for a customer to get subscriptions & plans for adding to customer return object.
				_.each(customerPaymentMethods, function (paymentMethod) {
					if (paymentMethod.subscriptions && paymentMethod.subscriptions.length > 0) {

						// Add each subscription for the current paymentMethod to customer subscriptions with plan details
						_.each(paymentMethod.subscriptions, function (subscription) {
							// Find plan details
							var plan = _.find(subscriptionPlans, function (plan) {
								return plan.id === subscription.planId;
							});

							// Add subscriptionPlan to subscription
							subscription.plan = plan;

							var defaultPaymentMethod = _.find(customerPaymentMethodsWithoutSubscriptions, function (paymentMethod) {
								return paymentMethod.token === subscription.paymentMethodToken;
							});

							// Add all saved paymentMethods to subscription
							subscription.defaultPaymentMethod = defaultPaymentMethod;
							subscription.storedPaymentMethods = customerPaymentMethodsWithoutSubscriptions;

							// Add the subscription with plan details to the Customer
							customer.subscriptions.push(subscription);
						});
					}
				});

				// TODO: Remove paymentMethods, creditcards and paypalAccounts

				// Return customer
				return response.send(200, {
					success: true,
					status: 200,
					customer: customer
				});
			});
		} else {
			// No Payment methods stored in the vault
			return response.send(200, {
				success: true,
				status: 200,
				customer: customer
			});
		}
	});
}

/**
 * Returns a token to be used on the client side to tokenize payment details
 * @param request
 * @param response
 */
function getClientToken(request, response) {
	gateway.clientToken.generate({}, function (err, res) {
		if (err) {
			throw err;
		}

		return response.json({
			'client_token': res.clientToken
		});
	});
}

/**
 * Get all available subscription plans
 * @param request
 * @param response
 */
function getSubscriptionPlans(request, response) {
	// TODO: Send email to developers if something goes wrong.

	gateway.plan.all(function (err, result) {
		if (err) {
			return response.send(500, {
				status: 500,
				message: 'An error occurred creating getting subscription plans' + err
			});
		} else {
			return response.send(200, result);
		}
	});
}

/**
 * Route to process a sale transaction
 * @param request
 * @param response
 */
function processSaleTransaction(request, response) {
	var transaction = request.body;
	gateway.transaction.sale({
		amount: transaction.amount,
		paymentMethodNonce: transaction.payment_method_nonce,
		merchantAccountId: transaction.merchantAccountId,
		submitForSettlement: true
	}, function (err, result) {
		if (err) {
			throw err;
		}

		return response.json(result);
	});
}

/**
 * Re-usable validation error response
 * @param result
 * @param response
 * @returns {*}
 * @private
 */
function _returnValidationErrorResponse(result, response) {
	// Validation errors
	var deepErrors = result.errors.deepErrors();
	var errorMessage;

	if (deepErrors.length) {
		errorMessage = formatErrors(deepErrors);
	} else {
		errorMessage = result.message;
	}

	return response.send(400, {
		success: false,
		status: 400,
		message: errorMessage,
		errors: deepErrors
	});
}
function _returnErrorResponse(errorMessage, err, response) {
	return response.send(500, {
		status: 500,
		message: errorMessage + err
	});
}

/**
 * Retries a transaction charge for a specific subscription.
 * Expects a ID parameter for a susbscription.
 * @param request
 * @param response
 */
function retrySubscriptionCharge(request, response) {
	var subscriptionId = request.params.id;

	gateway.subscription.retryCharge(subscriptionId, function (err, retryResult) {
		if (err) {
			return _returnErrorResponse('An error occurred retrying subscription transaction:', err, response);
		} else if (retryResult.success) {
			gateway.transaction.submitForSettlement(retryResult.transaction.id, function (err, result) {
				if (err) {
					return _returnErrorResponse('An error occurred submitting payment for settlement:', err, response);
				} else if (result.success) {
					return response.send(200, {
						success: true,
						status: 200,
						result: result
					});
				} else {
					return _returnValidationErrorResponse(result, response);
				}
			});
		} else {
			return _returnValidationErrorResponse(retryResult, response);
		}
	});
}

/**
 * Update a subscription for customer
 * @param request
 * @param response
 */
function updateSubscription(request, response) {
	var currentSubscriptionId = request.body.currentSubscriptionId;
	var subscriptionChanges = request.body.subscriptionChanges;

	// If we want to enable or disable auto renew
	var subscriptionPlans = [];

	gateway.subscription.find(currentSubscriptionId, function (err, result) {
		// Find the current billingCycle of the current subscription
		var currentBillingCycle = result.currentBillingCycle;

		// Get all subscription plans with details (name/description etc.)
		gateway.plan.all(function (err, results) {
			if (err) {
				// TODO: Handle errors
				console.log('Error fetching plans', err);
			}

			// Add plans to plans array
			_.each(results.plans, function (plan) {
				subscriptionPlans.push(plan);
			});

			// Find the plan we are trying to update to
			var plan = _.find(subscriptionPlans, function (plan) {
				return plan.id === subscriptionChanges.planId;
			});

			if (!plan) {
				return response.send(500, {
					status: 500,
					message: 'Could not find the selected subscription plan, please contact support.'
				});
			}

			// If we are trying to update the price of the subscription and does not match with the plan
			if (subscriptionChanges.price !== undefined && subscriptionChanges.price !== plan.price) {
				// Disable auto renew
				subscriptionChanges.price = 0.00;
				subscriptionChanges.numberOfBillingCycles = currentBillingCycle;
			} else {
				// Enable auto renew
				subscriptionChanges.price = plan.price;
				subscriptionChanges.numberOfBillingCycles = null;
			}

			gateway.subscription.update(currentSubscriptionId, subscriptionChanges, function (err, result) {
				if (err) {
					return response.send(500, {
						status: 500,
						message: 'An error occurred updating a subscription' + err
					});
				}

				else if (result.success) {
					return response.send(200, {
						success: true,
						status: 200,
						subscription: result
					});
				} else {
					// Validation errors
					var deepErrors = result.errors.deepErrors();
					var errorMessage;

					if (deepErrors.length) {
						errorMessage = formatErrors(deepErrors);
					} else {
						errorMessage = result.message;
					}

					return response.send(400, {
						success: false,
						status: 400,
						message: errorMessage,
						errors: deepErrors
					});
				}
			});
		});

	});
}

exports.cancelSubscription = cancelSubscription;
exports.createCustomer = createCustomer;
exports.createSubscription = createSubscription;
exports.createPaymentMethod = createPaymentMethod;
exports.deletePaymentMethod = deletePaymentMethod;
exports.getCustomer = getCustomer;
exports.getCustomerWithSubscriptionDetails = getCustomerWithSubscriptionDetails;
exports.getClientToken = getClientToken;
exports.getSubscriptionPlans = getSubscriptionPlans;
exports.retrySubscriptionCharge = retrySubscriptionCharge;
exports.processSaleTransaction = processSaleTransaction;
exports.updateSubscription = updateSubscription;

