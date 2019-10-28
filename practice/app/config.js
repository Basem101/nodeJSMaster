/**
 * create and export configuration variables
 */

// container for all environments
var environments = {};

// staging (default) environment
environments.staging = {
	'httpPort': 3000,
	'httpsPort': 3001,
	'envName': 'staging',
	'hashingSecret': 'canadianRedCross',
	'maxChecks' : 5,
	'twilio' : {
		'accountSid': 'AC61ced5097dad86093542a0be3b071066',
		'authToken': 'ba0a9dc2c17527f3c2f1f1ec3a7a25ba',
		'fromPhone': '+15878405154'
	},
	'templateGlobals' : {
		'appName' : 'upTimeChecker',
		'companyName' : 'NotARealCompany, Inc',
		'yearCreated': '2018',
		'baseUrl': 'http://localhost:3000/'
	}
};

// production environment
environments.production = {
	'httpPort': 5000,
	'httpsPort': 5001,
	'envName': 'production',
	'hashingSecret': 'canadianRedCross1',
	'maxChecks': 5,
	'twilio': {
		'accountSid': 'AC61ced5097dad86093542a0be3b071066',
		'authToken': 'ba0a9dc2c17527f3c2f1f1ec3a7a25ba',
		'fromPhone': '+15878405154'
	},
	'templateGlobals': {
		'appName': 'upTimeChecker',
		'companyName': 'NotARealCompany, Inc',
		'yearCreated': '2018',
		'baseUrl': 'http://localhost:5000/'
	}
};

// detairmine which environment was passed in as a command line argument
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

var environmentToExport = typeof(environments[currentEnvironment]) === 'object' ? environments[currentEnvironment] : environments.staging;

module.exports = environmentToExport;
