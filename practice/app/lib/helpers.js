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

module.exports = helpers;