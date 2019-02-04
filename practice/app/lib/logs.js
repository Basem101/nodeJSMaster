/*
	this is a library for storing and rotating logs 
*/
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// container for the module
const lib = {};

// bas directory for the logs folder
lib.baseDir = path.join(__dirname, '/../.logs/');

// Append aa  string to a file, create a file if it does not exist
lib.append = function(file, str, callback) {
	// Open the file for apending
	fs.open(lib.baseDir + file + '.log', 'a', function(err, fileDescriptor){
		if(!err && fileDescriptor) {
			// Append to the file and close it
			fs.appendFile(fileDescriptor, str + '\n', function(err) {
				if(!err) {
					fs.close(fileDescriptor, function(err) {
						if(!err) {
							callback(false);
						} else {
							callback('Error closing the file that was being appended');
						}
					});
				} else {
					callback('Error appending to file')
				}
			});
		} else {
			callback('Could not open the file for appending');
		}
	});
};

// list all the logs, and optionally include the compressed logs
lib.list = function(includeCompressedLogs, callback) {
	fs.readdir(lib.baseDir, function(err, data) {
		if(!err && data && data.length) {
			const trimmedFileNames = [];
			data.forEach(function(fileName) {
				// Add the .log files
				if(fileName.indexOf('.log') > -1) {
					trimmedFileNames.push(fileName.replace('.log', ''));
				}

				// Add on the .gz files 
				if(fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
					trimmedFileNames.push(fileName.replace('.gz.b64', ''));
				}

				callback(false, trimmedFileNames);
			});
		} else {
			callback(err, data);
		}
	});
};

// compress the content of one .log file into a .gz.b64 file within the same directory
lib.compress = function(logId, newFileId, callback) {
	const sourceFile = logId + '.log';
	const desFile = newFileId + '.gz.b64';

	// read teh source file
	fs.readFile(lib.baseDir + sourceFile, 'utf8', function(err, inputStr) {
		if(!err && inputStr) {
			// compress the data using gzip
			zlib.gzip(inputStr, function(err, buffer) {
				if(!err && buffer) {
					// Send the data to the desFile
					fs.open(lib.baseDir + desFile, 'wx', function(err, fileDescriptor) {
						if(!err && fileDescriptor) {
							// write to the desFile
							fs.writeFile(fileDescriptor, buffer.toString('base64'), function(err) {
								if(!err) {
									fs.close(fileDescriptor, function(err) {
										if(!err) {
											callback(false)
										} else {
											callback(err);
										}
									});
								} else {
									callback(err);
								}
							});
						} else {
							callback(err);
						}
					});
				} else {
					callback(err);
				}
			});
		} else {
			callback(err);
		}
	});
};

// Decompress the contents of a .gz.b64 file into a string variable
lib.decompress = function(fileId, callback) {
	const fileName = fileId + '.gz.b64';
	fs.readFile(this.baseDir + fileName, 'utf8', function(err, str) {
		if(!err, str) {
			// decompress the data
			let inputBuffer = Buffer.from(str, 'base64');
			zlib.unzip(inputBuffer, function(err, outputBuffer) {
				if(!err, outputBuffer) {
					const str = outputBuffer.toString();
					callback(false, str);
				} else {
					callback(err);
				}
			});
		} else {
			callback(err)
		}
	});
};

// truncate a log file
lib.truncate = function(logId, callback) {
	fs.truncate(lib.baseDir + logId + '.log', 0, function(err) {
		if(!err) {
			callback(false);
		} else {
			callback(err);
		}
	})
};

module.exports = lib;