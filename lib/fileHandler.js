"use strict"
var fs = require("fs");
var dir = require("node-dir");
var Q = require("q");
var path = require("path");
var _ = require("lodash");
var Buffer =  require("buffer").Buffer;

module.exports = {
    isAccessible: function(pathName) {
        return Q.Promise(function(resolve, reject) {
            fs.access(path.normalize(pathName), (fs.constants || fs).R_OK, function(err) {
                if(!err) {
                    return resolve(true);
                } else {
                    return reject(new Error(pathName + " not accessible."));
                }
            });
        });
    },
    writeToBuffer: function(where, data) {
        return Q.Promise(function(resolve, reject) {
            if(_.isObject(data)) {
                data = JSON.stringify(data, null, 4);
            } else {
                data = new Buffer(data);
            }
            fs.writeFile(where, data,'utf8', function(err) {
                if(err) {
                    return reject(err);
                } else {
                    return resolve();
                }
            });
        });
    },
    getFilenamesWithinFolder: function(folder) {
        return Q.Promise(function(resolve, reject) {
            dir.files(folder, function(err, files) {
                if(!err) {
                    return resolve(files);
                } else {
                    return reject(new Error("Not all filenames could be fetch on folder " + folder));
                }
            });
        });
    },
    checkExtensions: function(file, extensionArray) {
        var parsedPath = path.parse(file);
        if(_.indexOf(_.map(extensionArray, function(v) {  return "." + v }), parsedPath.ext) >= 0) {
            return true;
        } else {
            return false;
        }
    },
    readFileToString: function(file) {
        return Q.Promise(function(resolve, reject) {
            fs.readFile(file, function(err, data) {
                if(!err) {
                    return resolve(data.toString());
                } else {
                    return reject(new Error("Something went wrong reading file: " + err.message));
                }
            })
        });
    }
};