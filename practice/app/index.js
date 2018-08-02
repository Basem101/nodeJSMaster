/*
 * primary file for the API
 * 
 */

// Dependencies
const http = require('http');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;

// the server should respond to all requests with a string
const server = http.createServer(function(req, res){
	// when we create a server and a request comes in. these (req, res) objects parameters get filled in.
	// threse objects get filled in for each single request comes to the server.

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
	const reqHeaders = req.headers;

	// get the payload, if any
	const decoder = new StringDecoder('utf-8');
	let buffer = '';
	req.on('data', function(data) {
		console.log('data::');
		buffer += decoder.write(data);
		console.log('current buffer:: ', buffer);
	});

	req.on('end', function() { // this event will be emitted at the end of each request
		buffer += decoder.end();
		
			// send a response
			res.end('Hello World!\n');
			
			// log the request path
			console.log('\n');
			console.log(`
				Request received on path: ${trimmedPath}
				with method: ${method}
				with these query parameters :`, queryStringObject);
			console.log('\n');
			console.log('Request received with these headers:', reqHeaders)
	});


});

// start the server and have it listen to port 3000
server.listen(3000, function(){
	console.log('Server is listening on port 3000 now');
});
