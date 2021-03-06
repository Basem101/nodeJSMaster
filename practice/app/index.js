
/*
 * primary file for the API
 */

// dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');

const app = {};

// init
app.init = function () {
	// start the server
	server.init();

	// start the workers
	workers.init();
};

// execute
app.init();

// export the app
module.exports = app;
