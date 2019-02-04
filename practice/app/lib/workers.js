// these are workers related tasks

const path = require('path');
const fs = require('fs');
const _data = require('./data');
const https = require('https');
const http = require('http');
const helpers = require('./helpers');
const url = require('url');
const _logs = require('./logs');
const util = require('util');
const debug = util.debuglog('workers');
// instantiate workers
const workers = {};

workers.log = function(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck){
	// Form the log data
	const logData = {
		'check' : originalCheckData,
		'outcome': checkOutcome,
		'state' : state,
		'alert' : alertWarranted,
		'time' : timeOfCheck
	};

	// convert to a string
	const logStr = JSON.stringify(logData);

	// Determine the name of the log file
	const logFileName = originalCheckData.id;

	// Append  the log string to the file
	_logs.append(logFileName, logStr, function(err) {
		if(!err) {
			debug('Logging to file succeeded')
		} else {
			debug('Error: Logging to file failed');
		}
	});

};

// Timer to execute the worker-process once per minute
workers.loop = function() {
	setInterval(function(){
		workers.gatherAllChecks();
	}, 1000 * 60); // once a minute
};

workers.gatherAllChecks = function () {
	_data.list('checks', function(err, checks) {
		if(!err, checks.length > 0) {
			checks.forEach(check => {
				_data.read('checks', check, function(err, originalCheckData) {
					if(!err && originalCheckData) {
						// Pass check data to the validator and let the validator continue or log errors
						workers.validateCheckData(originalCheckData);
					} else {
						debug('Error reading one of the check\'s data');
					}
				});
			});
		} else {
			debug('Error: Could not find any checks to process');
		}
	});
};

workers.validateCheckData = function(originalCheckData) {
	originalCheckData = typeof(originalCheckData) === 'object' && originalCheckData !== null
		? originalCheckData
		: {};
	originalCheckData.id = typeof(originalCheckData.id) === 'string' && originalCheckData.id.trim().length === 20
		? originalCheckData.id
		: false;
	originalCheckData.userPhone = typeof (originalCheckData.userPhone) === 'string' && originalCheckData.userPhone.trim().length === 10 
		? originalCheckData.userPhone
		: false;
	originalCheckData.protocol = typeof (originalCheckData.protocol) === 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1
		? originalCheckData.protocol 
		: false;
	originalCheckData.url = typeof (originalCheckData.url) === 'string' && originalCheckData.url.trim().length > 0 
		? originalCheckData.url
		: false;
	originalCheckData.method = typeof (originalCheckData.method) === 'string' && ['get', 'post', 'put', 'delete'].indexOf(originalCheckData.method) > -1
		? originalCheckData.method 
		: false;
	originalCheckData.successCodes = typeof (originalCheckData.successCodes) === 'object' && originalCheckData.successCodes.length > 0
		? originalCheckData.successCodes
		: false;
	originalCheckData.timeoutSeconds = typeof (originalCheckData.timeoutSeconds) === 'number' && originalCheckData.timeoutSeconds >= 5
		? originalCheckData.timeoutSeconds
		: false;

	// set the keys that may bot be set
	// state key indicate the status of the chekc=> up or down(default)
	originalCheckData.state = typeof (originalCheckData.state) === 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1
		? originalCheckData.state
		: 'down';
		// lastChecked key will indicate the last time this check has been checked. if 0 that mean this check has never been checked.
	originalCheckData.lastCheked = typeof (originalCheckData.lastCheked) === 'number' && originalCheckData.lastCheked > 0
		? originalCheckData.timeoutSeconds
		: false;

	// if all checks pass. pass the data along to the next step in the process.
	if( originalCheckData.id && 
			originalCheckData.userPhone &&
			originalCheckData.protocol &&
			originalCheckData.url &&
			originalCheckData.method &&
			originalCheckData.successCodes &&
			originalCheckData.timeoutSeconds) {
				workers.proformCheck(originalCheckData);
	} else {
		debug('Error: one of the checks is not properly formatted. skipping it')
	}
};

// perform the check. send the originalCheckData and the outcome of the check process to the next step in the perocess
workers.proformCheck = function(originalCheckData) {
	// prepare the initial outcome object
	const checkOutcome = {
		'error': false,
		'responseCode': false
	};
	// mark the outcome has not sent yet
	let outcomeSent = false;

	// parse the hostname and path out of the original check data
	const parsedUrl = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true);
	const hostName = parsedUrl.hostname;
	const path = parsedUrl.path; // will be using pathname not path. because we want the query string object

	// construct the request
	const requestDetails = {
		'protocol': originalCheckData.protocol + ':',
		'hostname': hostName,
		'method': originalCheckData.method.toUpperCase(),
		'path': path,
		'timeoutSeconds': originalCheckData.timeoutSeconds * 1000
	};

	// instantiate the request object (using either http or https module)
	const _moduleToUse = originalCheckData.protocol === 'http' ? http : https;
	const req = _moduleToUse.request(requestDetails, function (res) {

		// grab the status of the sent request
		const status = res.statusCode;
		// update checkOutcome object. and pass the data along
		checkOutcome.responseCode = status;
		if (!outcomeSent) {
			workers.processCheckOutcome(originalCheckData, checkOutcome);
			outcomeSent = true;
		}
		// Bind to the error event so it does not get thrown
		req.on('error', function (e) {
			checkOutcome.error = {
				'error': true,
				'value': e
			};
			if (!outcomeSent) {
				workers.processCheckOutcome(originalCheckData, checkOutcome);
				outcomeSent = true;
			}
		});

		// Bind to the error event so it does not get thrown
		req.on('timeout', function (e) {
			checkOutcome.error = {
				'error': true,
				'value': 'timeout'
			};
			if (!outcomeSent) {
				workers.processCheckOutcome(originalCheckData, checkOutcome);
				outcomeSent = true;
			}
		});

	});
	// end the request
	req.end();
};

// process the check outcome, update the check data as needed. trigger an alert to the user if needed
// special logic for accomodating a check that has never been tested before(don't alert on this one)
workers.processCheckOutcome = function(originalCheckData, checkOutcome) {
	// decide if the check in up or down state
	const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

	// decid eif the alet if warranted
	const alertWarranted = originalCheckData.lastCheked && originalCheckData.state !== state;

	const timeOfCheck = Date.now();
	// log checkOutCome - state - alertWarranted
	workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

	// update the checkdata
	const newCheckData = originalCheckData;
	newCheckData.state = state;
	newCheckData.lastCheked = timeOfCheck;

	// save updates
	_data.update('checks', newCheckData.id, newCheckData, function(err) {
		if(!err) {
			// send the new check data to the nest phase in the process
			if(alertWarranted) {
				workers.alertUserToStatusChange(newCheckData);
			} else {
				debug('Check outcome has not changed. no alert needed');
			}
		} else {
			debug('Error trying to save updates to one of the checks');
		}
	});
};

// Alert user to a change in their check status
workers.alertUserToStatusChange = function(newCheckData) {
	const message = `Alert: your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol} :// ${newCheckData.url} is currently ${newCheckData.state}`;
	debug('Message: ', message);
	helpers.sendToTwilio(newCheckData.userPhone, message, function(err) {
		if(!err) {
			debug('Success: User has been alerted to a status change in their check, via sms', message);
		} else {
			debug('Error: Could not send sms alert to user who had a status change in their check');
		}
	});
};

// timer to execute the log-rotation process once per day
workers.logRotationLoop = function() {
	setInterval(function () {
		workers.rotateLogs();
	}, 1000 * 60 * 60 * 24); // once a day
};

// Rotate (compress) the log files
workers.rotateLogs = function() {
	// List all the non-compressed log files
	_logs.list(false, function(err, logs) {
		if(!err && logs && logs.length > 0) {
			logs.forEach(function(log) {
				// compress the data to a different file
				const logId = log.replace('.log', '');
				const newFileId = logId + '_' + Date.now();
				_logs.compress(logId, newFileId, function(err) {
					if(!err) {
						// truncate the log
						_logs.truncate(logId, function(err) {
							if(!err) {
								debug('Success truncating logFile');
							} else {
								debug('Error truncating logFile');
							}
						});
					} else {
						debug('Error compressing one of the log files', err);
					}
				});
			});
		} else {
			debug('Error : could not find any logs to rotate');
		}
	});
};

// intantiate workers.init
workers.init = function() {

	// send to debug in yellow
	// node colors: https://stackoverflow.com/questions/9781218/how-to-change-node-jss-debug-color
	console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');

	// Execute all the checks
	workers.gatherAllChecks();
	
	// call the loop si the checks will execute later on
	workers.loop();

	// Compress all the logd immediately
	workers.rotateLogs();

	// call the compression so logs will be compressed later on
	workers.logRotationLoop();
};

module.exports = workers;
