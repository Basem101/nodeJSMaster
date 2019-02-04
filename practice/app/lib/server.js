/*
 * primary file for the API
 * 
 */

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const { StringDecoder } = require('string_decoder');
const config = require('../config');
const fs = require('fs');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');
const util = require('util');
const debug = util.debuglog('server');

// instintiate HTTP server
const server = {};

 // Instantiate the HTTPS server
server.httpsServerOptions = {
   'key': fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
   'cert': fs.readFileSync(path.join(__dirname,'/../https/cert.pem'))
 };
server.httpsServer = https.createServer(server.httpsServerOptions, function(req, res) {
	server.unifiedServer(req, res);
});

// instantiate HTTP server
server.httpServer = http.createServer(function (req, res) {
	// when we create a server and a request comes in. these (req, res) objects parameters get filled in.
	// threse objects get filled in for each single request comes to the server.
	server.unifiedServer(req, res);
});


server.unifiedServer = function (req, res) {
	// get the url and parse it
	const parsedUrl = url.parse(req.url, true);
	// when we add true. we tell it to use the queryString module. 

	// get the path
	const pathName = parsedUrl.pathname;
	const trimmedPath = pathName.replace(/^\/+|\/+$/g, '');

	// get the http method
	const method = req.method.toLowerCase();

	// get the query string as an object
	const queryStringObject = parsedUrl.query;

	// get the headers as an object
	const headers = req.headers;

	// get the payload, if any
	const decoder = new StringDecoder('utf-8');
	let buffer = '';
	req.on('data', function (data) {
		buffer += decoder.write(data);
	});

	req.on('end', function () { // this event will be emitted at the end of each request
		buffer += decoder.end();

		var chooseHandler = typeof (server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;
		var data = {
			'path': trimmedPath,
			'method': method,
			'queryStringObject': queryStringObject,
			'headers': headers,
			'payload': helpers.parseJsonToObject(buffer)
		}

		chooseHandler(data, function (statusCode, payload, contentType) {
			// determine the type of the response
			contentType = typeof(contentType) === 'string' ? contentType : 'json';
			statusCode = typeof (statusCode) === 'number' ? statusCode : 200;
			
			let payloadString = '';
			
			// Return the response parts that are content-specific
			if(contentType === 'json') {
				res.setHeader('Content-type', 'application/json');
				payload = typeof (payload) === 'object' ? payload : {};
				payloadString = JSON.stringify(payload);
			}
			if(contentType === 'html') {
				res.setHeader('Content-type', 'text/html');
				payloadString = typeof(payload) === 'string' ? payload : '';
				
			}

			// Return the response parts that are common to all content-types
			res.writeHead(statusCode);
			res.end(payloadString);

			// if the response is 200, print green ptherwise print red
			if(statusCode === 200) {
				debug('\x1b[32m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
			} else {
				debug('\x1b[31m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
			}
		});
	});
}

server.router = {
	'': handlers.index,
	'accounts/create': handlers.accountCreate,
	'accounts/edit': handlers.accountEdit,
	'account/deleted': handlers.accountDeleted,
	'session/create': handlers.sesssionCreate,
	'session/deleted': handlers.sesssionDeleted,
	'checks/all': handlers.checksList,
	'checks/create': handlers.checksCreate,
	'check/edit': handlers.checksEdit,
	'sample': handlers.sample,
	'ping': handlers.ping,
	'api/users': handlers.users,
	'api/tokens': handlers.tokens,
	'api/checks': handlers.checks
};

server.init = function () {

	// start http server
	server.httpServer.listen(config.httpPort, function () {
		console.log('\x1b[36m%s\x1b[0m', 'the server is listening on port ' + config.httpPort);
		
	});
	
	// start https server
	server.httpsServer.listen(config.httpsPort, function () {
		console.log('\x1b[35m%s\x1b[0m', 'the server is listening on port ' + config.httpsPort);
	});
};


module.exports = server;