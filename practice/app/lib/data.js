/*
Library for storing and editing data
*/

// Dependencies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

// container for the module (to be exported)

var lib = {};

// bas directory for the data folder
lib.baseDir = path.join(__dirname, '/../.data/');

// white data to a file
lib.create = function(dir, file, data, callback) {
	// open the file for writing
	fs.open(lib.baseDir+dir+'/'+file+'.json', 'wx', function(err, fileDescriptor) {
		if(!err && fileDescriptor) {
			// convrert data to string
			var stringData = JSON.stringify(data);
			// write file and close it
			fs.writeFile(fileDescriptor, stringData, function(err) {
				if(!err) {
					fs.close(fileDescriptor, function(err) {
						if(!err) {
							callback(false); // this callback is expeciting an error. so when we pass in false. it meatns there's no errors
						} else {
							callback('Error closing new file')
						}
					});
				} else {
					callback('Error writing to new file');
				}
			});
		} else {
			callback('Could not create new file, it may be already exist');
		}
	});
};

// Read data from a file
lib.read = function(dir, file, callback) {
	fs.readFile(lib.baseDir + dir + '/' + file + '.json', 'utf8', function(err, data){
		if(!err && data) {
			var parsedData = helpers.parseJsonToObject(data);
			callback(false, parsedData)
		} else {
			callback(err, data);
		}
	});
};

// update data inside a file
lib.update = function(dir, file, data, callback) {
	// open the file for writing
	fs.open(lib.baseDir + dir + '/' + file + '.json', 'r+', function(err, fileDescriptor) {
		// fs.open flags https://nodejs.org/api/fs.html#fs_file_system_flags
		if (!err && fileDescriptor) {
			// convrert data to string
			var stringData = JSON.stringify(data);
			fs.ftruncate(fileDescriptor, function(err) {
				if(!err) {
					// write to the file and close it
					fs.writeFile(fileDescriptor, stringData, function(err) {
						if(!err) {
							fs.close(fileDescriptor, function(err) {
								if(!err) {
									callback(false);
								} else {
									callback('error closing file');
								}
							});
						} else {
							callback('error writing to existing file');
						}
					});
				} else {
					callback('error truncating file');
				}
			});
		} else {
			callback('Could not open the file for updating, It may not exist yet!');
		}
	})
};

// delete a file
lib.delete = function(dir, file, callback) {
	// Unlink the file
	fs.unlink(lib.baseDir+dir+'/'+file+'.json', function(err) {
		if(!err) {
			callback(false);
		} else {
			callback('Error deleting a file');
		}
	});
};

// list all the item in a directory
lib.list = function(dir, callback) {
	fs.readdir(lib.baseDir + dir + '/', function(err, data) {
		if(!err && data && data.length) {
			const trimmedFileNames = [];
			data.forEach(function(file){
				trimmedFileNames.push(file.replace('.json', ''));
			});
			callback(false, trimmedFileNames);
		} else {
			callback(err, data);
		}
	});
};

// export the library
module.exports = lib;