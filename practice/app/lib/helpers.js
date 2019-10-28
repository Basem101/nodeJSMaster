/**
 * helpers methods for varius tasks
 * 1- hash ==> hash passwords
 * 
 */

//  dependencies
const crypto = require('crypto');
const config = require('../config');
const https = require('https');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');

// helpers container
var helpers = {};

// hash passwords
helpers.hash = function(password) {
	if(typeof(password) === 'string' && password.length > 0) {
		const hashedPassword = crypto.createHmac('sha256', config.hashingSecret).update(password).digest('hex');
		return hashedPassword;
	} else {
		return false;
	}
};

// parse a JSON string to an object in all cases, without throwing 
helpers.parseJsonToObject = function(str) {
	try {
		var obj = JSON.parse(str);
		return obj;
	} catch(err) {
		return {};
	}
};

// create a random string of alphanumeric characters, of a given length
helpers.createRandomString = function(strLength) {
	strLength = typeof(strLength) === 'number' && strLength > 0
		? strLength
		: false;

	if(strLength) {
		// Define all charactes that could go into a string
		const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';

		// create an empty string
		let str = '';
		for(let i = 0; i < strLength; i++) {
			const randomChar = characters.charAt(Math.floor(Math.random() * characters.length));
			str += randomChar;
		}
		return str;
	} else {
		return false;
	}
};

// send an SMS message via Twilio
helpers.sendToTwilio = function(phone, message, callback) {
	// validate parameters
	phone = typeof(phone) === 'string' && phone.trim().length === 10 ? phone.trim() : false;
	message = typeof(message) === 'string' && message.trim().length <= 1600 ? message : false;

	if(phone && message) {
		// configure request payload
		const payload = {
			'From' : config.twilio.fromPhone,
			'To' : '+1' + phone,
			'Body' : message
		};
		// stringify payload
		const payloadStr = querystring.stringify(payload);
		// send the payload to twilio API

		// config request object
		const requestObj = {
			'protocol' : 'https:',
			'hostname' : 'api.twilio.com',
			'method' : 'POST',
			'path' : '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
			'auth' : config.twilio.accountSid + ':' + config.twilio.authToken,
			'headers' : {
				'Content-Type' : 'application/x-www-from-urlencoded',
				'Content-Length' : Buffer.byteLength(payloadStr)
			}
		}
		// Instantiate https request
		const req = https.request(requestObj, function(res) {
			// get the status of the request
			const status = res.statusCode;
			if(status === 200 || status === 201) {
				callback(false); // no-error
			} else {
				callback(`Status Code returned id ${status}`);
			}
		});

		// Bind to Error event
		req.on('error', function(e) {
			callback(e);
		});

		req.write(payloadStr);

		// send the request - End the request 'same'
		req.end();

	} else {
		callback('Given parameters were missing or invalid');
	}
};

// Get the string content of a template
helpers.getTemplate = (templateName, data, callback) => {
	templateName = typeof(templateName) === 'string' && templateName.length > 0 ? templateName : false;
	data = typeof(data) === 'object' && data !== null ? data : {};
	if(templateName) {
		const templatesDir = path.join(__dirname, '/../templates/');
		fs.readFile(templatesDir + templateName + '.html', 'utf8', (err, str) => {
			if(!err && str && str.length > 0) {
				// Do the interpolation on the string before returning it.
				const finalStr = helpers.interpolate(str, data)
				callback(false, finalStr);
			} else {
				callback('No template could be found');
			}
		})
	} else {
		callback('A valid template name was not specified');
	}
}

// Take a given string and a data object and find/replace all the keys within it
helpers.interpolate = (str, data) => {
	str = typeof(str) === 'string' && str.length ? str : '';
	data = typeof(data) === 'object' && data !== null ? data : {};


	// add the templateGlobals to the data object, prepend their key name with "global"
	for(let keyName in config.templateGlobals) {
		if(config.templateGlobals.hasOwnProperty(keyName)) {
			data['global.' + keyName] = config.templateGlobals[keyName];
			// data['global'][keyName] = config.templateGlobals;
		}
	}
	
	// For each key in the data object, insert its value into the string at the corresponding place holder
	for(let key in data) {
		if(data.hasOwnProperty(key) && typeof(data[key]) === 'string') {
			const replace = data[key];
			const find = '{' + key + '}';
			str = str.replace(find, replace);
		}
	}
	return str;
}

// Add the universal header and footer to a string and pass the provided data object to the header and footer for interpolation
helpers.addUniversalTemplates = (str, data, callback) => {
	str = typeof(str) === 'string' && str.length ? str : '';
	data = typeof(data) === 'object' && data !== null ? data : {};
	// Get the geader
	helpers.getTemplate('_header', data, (err, headerStr) => {
		if(!err, headerStr) {
			helpers.getTemplate('_footer', data, (err, footerStr) => {
				if(!err, footerStr) {
					const fullString = headerStr + str + footerStr;
					callback(false, fullString);
				} else {
					callback('Could not find the footer template');
				}
			});
		} else {
			callback(' Could not find the header template');
		}
	});
};

// Get the contents of a static (public) asset
helpers.getStaticAsset = function(fileName, callback) {
	fileName = typeof(fileName) == 'string' && fileName.length > 0 ? fileName : false;
	if(fileName) {
		var publicDir = path.join(__dirname, '../public/');
		fs.readFile(publicDir + fileName, function(err, data) {
			if(!err && data) {
				callback(false, data);
			} else {
				callback('No file found');
			}
		})
	} else {
		callback('A file name was not specified');
	}
}

module.exports = helpers;