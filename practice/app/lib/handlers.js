/*
* Request Handlers
*/

// dependencies
const _data = require('./data');
const helpers = require('./helpers');
const _checks = require('./controllers/checks');
const _users = require('./controllers/users');
const _tokens = require('./controllers/tokens');

// handlers container
var handlers = {};


/**
 * HTML Handlers
*/

// Index handlers
handlers.index = (data, callback) => {
	// Reject any request that is not a GET
	if(data.method === 'get') {
		// Read in a template as a string;
		helpers.getTemplate('index', (err, str) => {
			if(!err && str) {
				callback(200, str, html);
			} else {
				callback(500, undefined, 'html');
			}
		})
	} else {
		callback(405, undefined, 'html');
	}
	callback(undefined, undefined, 'html');
}





/*
 * JSON API Handlers
*/

// assign controllers
handlers._users = _users;
handlers._checks = _checks;
handlers._tokens = _tokens;

handlers.sample = function (data, callback) {
	callback(200, {
		"name": "sample"
	});
};

handlers.ping = function (data, callback) {
	callback(200);
}

handlers.notFound = function (data, callback) {
	callback(400)
};


// Users main handler
handlers.users = function (data, callback) {
	const acceptableMethods = ['get', 'post', 'put', 'delete'];
	if (acceptableMethods.indexOf(data.method) > -1) {
		handlers._users[data.method](data, callback);
	} else {
		callback(405); // 405 http status code for method not allowed
	}
}

// Tokens main handler
handlers.tokens = function (data, callback) {
	const acceptableMethods = ['get', 'post', 'put', 'delete'];
	if (acceptableMethods.indexOf(data.method) > -1) {
		handlers._tokens[data.method](data, callback);
	} else {
		callback(405); // 405 http status code for method not allowed
	}
}

// checks main handler
handlers.checks = function (data, callback) {
	const acceptableMethods = ['get', 'post', 'put', 'delete'];
	if (acceptableMethods.indexOf(data.method) > -1) {
		handlers._checks[data.method](data, callback);
	} else {
		callback(405); // 405 http status code for method not allowed
	}
}


module.exports = handlers;
