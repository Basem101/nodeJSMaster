// dependencies

const _data = require('../data');
const helpers = require('../helpers');
const config = require('../../config');
const _tokens = require('./tokens');


// checks handler
// container for all checks methods
const _checks = {};

// checks - post
// required data: protocol, url, method, successCodes, timeoutSeconds
// optional : none

_checks.post = function (data, callback) {
	// validate all inputs
	const protocol = typeof (data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 
	? data.payload.protocol
	: false;

	const url = typeof (data.payload.url) == 'string' && data.payload.url.trim().length > 1 
	? data.payload.url
	: false;

	const method = typeof (data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 
	? data.payload.method 
	: false;

	const successCodes = typeof (data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 
	? data.payload.successCodes
	: false;

	const timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 
	? data.payload.timeoutSeconds
	: false;


	if (protocol && url && method && successCodes && timeoutSeconds) {
		// get the tokens from the header
		const token = typeof (data.headers.token) === 'string' ? data.headers.token : false;
		// lookup the user by reading the token
		_data.read('tokens', token, function (err, tokenData) {
			if (!err && tokenData) {
				const userPhone = tokenData.phone;
				// lookup user by phone number
				_data.read('users', userPhone, function (err, userData) {
					if (!err, userData) {
						const userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
						// verify that the user has less than the number of max-checks-per-user
						if (userChecks.length < config.maxChecks) {
							// create a random ID for the check
							const checkId = helpers.createRandomString(20);
							// create the check object and include the user's phone
							const checkObj = {
								'id': checkId,
								'userPhone': userPhone,
								'protocol': protocol,
								'url': url,
								'method': method,
								'successCodes': successCodes,
								'timeoutSeconds': timeoutSeconds
							};

							_data.create('checks', checkId, checkObj, function (err) {
								if (!err) {
									// add the checkId to users object
									userData.checks = userChecks;
									userData.checks.push(checkId);
									// save the new user data
									_data.update('users', userPhone, userData, function (err) {
										if (!err) {
											// return the data about the new check to the user
											callback(200, checkObj);
										} else {
											callback(500, {
												'Error: ': 'Could not update the user with the new check'
											})
										}
									});
								} else {
									callback(500, {
										'Error: ': 'Could not create the new check'
									});
								}
							});
						} else {
							callback(400, {
								'Error: ': 'the user already has the maximum number of checks (' + config.maxChecks + ')'
							});
						}
					} else {
						callback(403);
					}
				});
			} else {
				callback(403, {
					'Error: ': 'User is not authorized'
				});
			}
		});
	} else {
		callback(400, {
			'Error: ': 'Missing required inputs - or inputs are invalid'
		})
	}

}

// Tokens - get
// required data: id
// optional data: none
_checks.get = function (data, callback) {
	// check that the id is valid
	const id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.length === 20 
		?	data.queryStringObject.id.trim() 
		:	false;

	// lookup the check
	_data.read('checks', id, function(err, checkData) {
		if(!err && checkData) {

			const token = typeof (data.headers.token) === 'string' ? data.headers.token : false;
			// verify that the given token is valid for the user who created the check
			_tokens.verifyToken(token, checkData.userPhone, function (isValidToken) {
				if (isValidToken) {
					callback(200, checkData);
				} else {
					callback(403, {
						'Error: ': 'User is not authenticated - token in not valid - check ==> get'
					});
				}
			});

		} else {
			callback(404);
		}
	});
}

// checks - put
// required data: id
// optional data: none
_checks.put = function (data, callback) {

	// check for the required field
	const id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == 20 
	? data.payload.id.trim() 
	: false;

	const protocol = typeof (data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 
	? data.payload.protocol
	: false;

	const url = typeof (data.payload.url) == 'string' && data.payload.url.trim().length > 1 
	? data.payload.url
	: false;

	const method = typeof (data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 
	? data.payload.method 
	: false;

	const successCodes = typeof (data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 
	? data.payload.successCodes
	: false;

	const timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 
	? data.payload.timeoutSeconds
	: false;



	// check to make sure ID is valid
	if (id) {
		// check to make sure one or more optional field has been sent
		if(protocol || url || method || successCodes || timeoutSeconds) {
			// lookup the chek by Id
			_data.read('checks', id, function(err, checkData){
				if(!err, checkData) {

					const token = typeof (data.headers.token) === 'string' ? data.headers.token : false;
					// verify that the given token is valid for the user who created the check
					_tokens.verifyToken(token, checkData.userPhone, function (isValidToken) {
						if (isValidToken) {
						// update the check
							if(protocol) { checkData.protocol = protocol }
							if(url) { checkData.url = url }
							if(method) { checkData.method = method }
							if(successCodes) { checkData.successCodes = successCodes }
							if(timeoutSeconds) { checkData.timeoutSeconds = timeoutSeconds }

							// store the updates
							_data.update('checks', id, checkData, function(err) {
								if(!err) {
									callback(200, {
										'Success: ' : 'Check ' + id +'has been updated'
									});
								} else {
									callback(500, {
										'Error: ' : 'Could not update check object'
									});
								}
							});
						} else {
							callback(403, {
								'Error: ': 'User is not authenticated - token in not valid - check ==> put'
							});
						}
					});


				} else {
					callback(400, {
						'Error: ' : 'Checl ID does not exist'
					});
				}
			});
		} else {
			callback(400, {
				'Error: ' : 'missing field to update'
			});
		}
	} else {
		callback(400, {
			'Error: ': 'Missing required field/ID'
		});
	}
};

// checks - delete
// required data: Id 
// optional data: none
_checks.delete = function (data, callback) {
	// check that tokenId is valid

	const id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.length === 20 
	? data.queryStringObject.id.trim()
	: false;

	// lookup the check
	_data.read('checks', id, function(err, checkData){
		if(!err && checkData) {

			const token = typeof (data.headers.token) === 'string' ? data.headers.token : false;
			// verify that the given token is valid for the user who created the check
			_tokens.verifyToken(token, checkData.userPhone, function (isValidToken) {
				if (isValidToken) {
					// celete the check data
					_data.delete('checks', id, function(err) {
						if(!err) {
						_data.read('users', checkData.userPhone, function (err, userData) {
							if (!err && userData) {
								const userChecks = typeof (userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];
								// remeve the deleted checks from the list
								const checkPosition = userChecks.indexOf(id);
								if(checkPosition > -1) {
									userChecks.splice(checkPosition, 1);
									// re-save user data
									_data.update('users', checkData.userPhone, userData, function(err) {
										if(!err) {
											callback(200, {
												'Message: ' : 'User checks list has been updated'
											})
										} else {
											callback(500, {
												'Error: ' : 'Could not upate the specified user data'
											})
										}
									});
								} else {
									callback(500, {
										'Error: ' : 'Could not find the check in the list'
									});
								}
							} else {
								callback(500, {
									'Error: ': 'Could not find the user who created the check'
								});
							}
						});





						} else {
							callback(500, {
								'Error: ' : 'Could not delete this check'
							});
						}
					});
				} else {
					callback(403, {
						'Error: ': 'User is not authenticated - token in not valid - check ==> delete'
					});
				}
			});

		} else {
			callback(400, {
				'Error: ' : 'No check found with this id'
			});
		}
	});
};

module.exports = _checks;