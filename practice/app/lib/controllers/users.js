// dependencies

const _data = require('../data');
const helpers = require('../helpers');
const config = require('../../config');
const _tokens = require('./tokens');

const _users = {};

// Users - post
_users.post = function (data, callback) {
	// check all required fields are filled up
	const firstName = typeof (data.payload.firstname) == 'string' && data.payload.firstname.trim().length > 0 ?
		data.payload.firstname.trim() :
		false;

	const lastName = typeof (data.payload.lastname) == 'string' && data.payload.lastname.trim().length > 0 ?
		data.payload.lastname.trim() :
		false;

	const phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ?
		data.payload.phone.trim() :
		false;

	const password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ?
		data.payload.password.trim() :
		false;

	const tosAgreement = typeof (data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ?
		true :
		false;

	if (firstName && lastName && password && phone && tosAgreement) {
		// make sure user doesn't already exist. phone must be unique
		_data.read('users', phone, function (err, data) {
			if (err) { // no file exist with this phone number. create a new file
				// hash the password and create a new password
				const hashedPassword = helpers.hash(password);
				if (hashedPassword) {
					const userObject = {
						'firstName': firstName,
						'lastName': lastName,
						'phone': phone,
						'hashedPassword': hashedPassword,
						'tosAgreement': true
					};
					_data.create('users', phone, userObject, function (err) {
						if (!err) {
							callback(200)
						} else {
							console.log(err);
							callback(500, {
								'Error: ': 'Could not create the new user'
							});
						}
					});
				} else {
					callback(500, {
						'Error: ': 'Could not hash user\' password'
					});
				}
			} else {
				// User already exist
				callback(400, {
					'Error: ': 'A user with this phone number already exist'
				});
			}
		});
	} else {
		callback(400, {
			'Error: ': 'Missing required fields'
		});
	}


};

// Users - get
// required data : phone
// optional data : none
// required:  user must be authentication to access their object
_users.get = function (data, callback) {
	// check that phone number is valid
	const phone = typeof (data.queryStringObject.phone) == 'string' &&
		data.queryStringObject.phone.length == 10 ?
		data.queryStringObject.phone.trim() :
		false;

	if (phone) {
		// since user must be authenticated to perform this action. token must be included in the header request object.
		const token = typeof (data.headers.token) === 'string' ? data.headers.token : false;
		// verify that the given token is valid for the phone
		_tokens.verifyToken(token, phone, function (isValidToken) {
			if (isValidToken) {
				_data.read('users', phone, function (err, data) {
					if (!err && data) {
						// remove hashed password from the object before returning it to the requester
						delete data.hashedPassword;
						callback(200, data);
					} else {
						callback(404);
					}
				});
			} else {
				callback(403, {
					'Error: ': 'User is not authenticated - token is required in the header - token in not valid'
				});
			}
		});
	} else {
		callback(400, {
			'Error: ': 'Missing required phone'
		})
	}
};

// Users - put
// required data : phone
// options data : firstName, lastName, password (at least one must be specified)
// @TODO: only authenticated user should be able to update their object
_users.put = function (data, callback) {
	// check for the required field
	const phone = typeof (data.payload.phone) == 'string' &&
		data.payload.phone.length == 10 ?
		data.payload.phone.trim() :
		false;

	// check for the optional field
	const firstName = typeof (data.payload.firstname) == 'string' && data.payload.firstname.trim().length > 0 ?
		data.payload.firstname.trim() :
		false;

	const lastName = typeof (data.payload.lastname) == 'string' && data.payload.lastname.trim().length > 0 ?
		data.payload.lastname.trim() :
		false;

	const password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ?
		data.payload.password.trim() :
		false;

	// Error if phone is invalid
	if (phone) {
		// Error if nothing is sent to update
		if (firstName || lastName || password) {


			const token = typeof (data.headers.token) === 'string' ? data.headers.token : false;
			// verify that the given token is valid for the phone
			_tokens.verifyToken(token, phone, function (isValidToken) {
				if (isValidToken) {
					// Lookup the user
					_data.read('users', phone, function (err, userData) {
						if (!err && userData) {
							if (firstName) {
								userData.firstName = firstName
							}
							if (lastName) {
								userData.lastName = lastName
							}
							if (password) {
								userData.hashedPassword = helpers.hash(password)
							}
							// store the new update
							_data.update('users', phone, userData, function (err) {
								if (!err) {
									callback(200);
								} else {
									console.log(err);
									callback(500, {
										'Error: ': 'Could not update the user'
									});
								}
							});
						} else {
							callback(400, {
								'Error: ': 'User does not exist'
							});
						}
					});
				} else {
					callback(403, {
						'Error: ': 'User is not authenticated - token is required in the header - token in not valid'
					});
				}
			});
		} else {
			callback(400, {
				'Error: ': 'Missing Fields to update'
			});
		}
	} else {
		callback(400, {
			'Error: ': 'Missing required phone'
		});
	}
};

// Users - delete
// @TODO: user must be authentication to access their object
_users.delete = function (data, callback) {
	// check that phone number is valid
	const phone = typeof (data.queryStringObject.phone) == 'string' &&
		data.queryStringObject.phone.length == 10 ?
		data.queryStringObject.phone.trim() :
		false;

	if (phone) {

		const token = typeof (data.headers.token) === 'string' ? data.headers.token : false;
		// verify that the given token is valid for the phone
		_tokens.verifyToken(token, phone, function (isValidToken) {
			if (isValidToken) {
				_data.read('users', phone, function (err, userData) {
					if (!err && data) {
						_data.delete('users', phone, function (err) {
							if (!err) {
								// callback(200);
								// delete all checks associated with this user
								const userChecks = typeof (userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];
								const checksToDelete = userChecks.length;

								if(checksToDelete > 0) {
									let checksDeleted = 0;
									let deletionErrors = false;

									userChecks.forEach(checkId => {
										// delete the check
										_data.delete('checks', checkId, function(err) {
											if(err) { deletionErrors = true; }
											checksDeleted++;
											if(checksDeleted === checksToDelete) {
												if(!deletionErrors) { 
													callback(200); 
												} else {
													callback(500, {
														'Error: ' : 'Errors encountered while attempting to delete all userchecks - all checks may not have been deleted successfully'
													});
												}
											}
										});
									});

								} else {
									callback(200); 
								}
							} else {
								callback(500, {
									'Error': 'Could not delete the user'
								});
							}
						})
					} else {
						callback(400, {
							'Error : ': 'Could not find the specified user'
						});
					}
				});
			} else {
				callback(403, {
					'Error: ': 'User is not authenticated - token is required in the header - token in not valid'
				});
			}
		});
	} else {
		callback(400, {
			'Error: ': 'Missing required phone'
		})
	}
};

module.exports = _users;