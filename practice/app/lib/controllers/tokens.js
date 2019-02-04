// dependencies
const _data = require('../data');
const helpers = require('../helpers');

// tokens container
const _tokens = {};

// Tokens - post
// required data: phone, password ==> this is a user creating a token
// optional : none
_tokens.post = function (data, callback) {
	const phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ?
		data.payload.phone.trim() :
		false;

	const password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ?
		data.payload.password.trim() :
		false;

	if (phone && password) {
		// Lookup the user who matches this phone number
		_data.read('users', phone, function (err, userData) {
			if (!err, userData) {
				// hash the sent password and compare it to the stored password
				const hashedPassword = helpers.hash(password);
				if (hashedPassword === userData.hashedPassword) {
					//  create a new token witha random name - ser expiration data 1 hour in the future
					const tokenId = helpers.createRandomString(20);
					const expires = Date.now() + 1000 * 60 * 60;
					var tokenObj = {
						'phone': phone,
						'id': tokenId,
						'expires': expires
					};

					_data.create('tokens', tokenId, tokenObj, function (err) {
						if (!err) {
							callback(200, tokenObj);
						} else {
							callback(500, {
								'Error: ': 'Could not create a token'
							});
						}
					});
				} else {
					callback(400, {
						'Error: ': 'Password is invalid'
					});
				}

			} else {
				callback(400, {
					'Error: ': 'Could not find the user'
				})
			}
		});
	} else {
		callback(400, {
			'Error: ': 'Missing required field'
		})
	}

}

// Tokens - get
// required data: id
// optional data: none
_tokens.get = function (data, callback) {
	// check that the id is valid
	const id = typeof (data.queryStringObject.id) == 'string' &&
		data.queryStringObject.id.length == 20 ?
		data.queryStringObject.id.trim() :
		false;
	console.log('ID: ', id);
	if (id) {
		_data.read('tokens', id, function (err, tokenData) {
			if (!err && data) {
				console.log('data: ', data);
				callback(200, tokenData);
			} else {
				callback(404);
			}
		});
	} else {
		callback(400, {
			'Error: ': 'Missing required ID'
		})
	}

}

// Tokens - put
// they only use case for the put method is to extend the expiry data. {extend : true}
// required data: id, extend
// optional data: none
_tokens.put = function (data, callback) {
	// check that the id is valid
	console.log('Data: ', data);
	const id = typeof (data.payload.id) == 'string' &&
		data.payload.id.length == 20 ?
		data.payload.id.trim() :
		false;

	// check that the id is valid
	const extend = typeof (data.payload.extend) == 'boolean' && data.payload.extend === true ?
		true :
		false;

	console.log('ID + extend', id, extend);

	if (id && extend) {
		// lookup the token
		_data.read('tokens', id, function (err, tokenData) {
			if (!err && tokenData) {

				// make sure the token is not already expired
				if (tokenData.expires > Date.now()) {

					// set new expiry date after 1 houre
					const newExpiryDate = Date.now() + 1000 * 60 * 60;
					// update the token with the new expiry date
					tokenData.expires = newExpiryDate;

					_data.update('tokens', id, tokenData, function (err) {
						if (!err) {
							callback(200, {
								'Message': ' Expiry data has been updated'
							});
						} else {
							callback(500, {
								'Error: ': 'Can not update the token'
							});
						}
					});


				} else {
					callback(400, {
						'Error: ': 'Token has already expired and can not be extended'
					});
				}

			} else {
				callback(400, {
					'Error: ': 'Can not find the token for the specified ID'
				});
			}
		});
	} else {
		callback(400, {
			'Error: ': 'Missing Extend Field or extend field is invalid'
		});
	}
};

// Tokens - delete
// required data: tokenID 
// optional data: none
_tokens.delete = function (data, callback) {
	// check that tokenId is valid
	console.log('data::tokenId ', data.queryStringObject);
	const tokenId = typeof (data.queryStringObject.id) == 'string' &&
		data.queryStringObject.id.length == 20 ?
		data.queryStringObject.id.trim() :
		false;

	if (tokenId) {
		_data.read('tokens', tokenId, function (err, data) {
			if (!err && data) {
				_data.delete('tokens', tokenId, function (err) {
					if (!err) {
						callback(200, {
							'Message : ': 'Token has been deleted successfully'
						});
					} else {
						callback(500, {
							'Error': 'Could not delete the token'
						});
					}
				})
			} else {
				callback(400, {
					'Error : ': 'Could not find the specified token'
				});
			}
		});
	} else {
		callback(400, {
			'Error: ': 'Missing required tokenId'
		})
	}
};

// verify a token id is currently valid for a given user
_tokens.verifyToken = function (id, phone, callback) {
	// Lookup the token
	_data.read('tokens', id, function (err, tokenData) {
		if (!err, tokenData) {
			// check if the token is for the given user and has not expired
			if (tokenData.phone === phone && tokenData.expires > Date.now()) {
				callback(true);
			} else {
				callback(false);
			}
		} else {
			callback(false);
		}
	});
};

module.exports = _tokens;