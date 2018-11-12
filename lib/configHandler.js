"use strict";
var Q = require("q");
var _ = require("lodash");
var path = require("path");
var fileHandler = require("./fileHandler");

function checkAttributes(config) {
    return Q.Promise(function(resolve, reject) {
        if(!config || _.isEmpty(config)) {
            return reject(new Error("Invalid or empty configuration file provided."));
        } else {
            if(!_.has(config,"locales.rootPath") || !_.has(config,"locales.default") || !_.has(config,"applyTo")) {
                return reject(new Error("config file is not filled with required information."));
            }
            _.defaults(config, { types: ["txt", "msg", "btn", "err"]});
            if(_.has(config, "defaultType")) {
                if(!_.some(config.types, function(type) { return config.defaultType === type })) {
                    return reject(new Error("config file error, no type valid for 'defaultType'"));
                }     
            }
            if(_.has(config, "transform")) {
                _.forEach(config.transform, function(modifier) {
                    var isValidType = _.find(config.types, function(type) {
                        return type === modifier.to;
                    });
                    if(!isValidType) {
                        return reject(new Error("config file error, no type valid for: '" + modifier.to + "' set on transform"));
                    }
                })
            } else {
                _.defaults(config, { transform: []});
            }
            if(_.has(config, "removeIdentical")) {
                if(!_.isBoolean(config.removeIdentical)) {
                    return reject(new Error("config file error, removeIdenticals property with invalid value"));
                } else {
                    config.hasRemoveIdentical = true;
                }
            } else {
                config.hasRemoveIdentical = false;
            }
            if(_.has(config, "forceCheck")) {
                if(_.isEmpty(config.forceCheck)) {
                    config.forceCheck = false;
                } else {
                    _.forEach(config.forceCheck, function(singleRe) {
                        if(!_.isRegExp(singleRe)) {
                            return reject(new Error("config file error, '" + singleRe + "' is not a valid Regex"));
                        }
                    });
                }                
            } else {
                config.forceCheck = false;
            }
       }
       return resolve(config);
    });
}

function createEntries(config) {
    return Q.Promise(function(resolve, reject) {
        _.defaults(config,{
             paths: {
                applyFiles: {
                     original: []
                 },
                locales: {
                     original: []
                 }
        }});
        return Q.all(_.map(config.applyTo, function(apply) {
                return fileHandler.getFilenamesWithinFolder(path.normalize(apply)); 
        }))
        .then(function(applies) {
           return Q.all([
               Q.all(_.map(_.reject(_.flatten(applies), function(file) {
                if(!fileHandler.checkExtensions(file, ["json", "html", "jade", "js"])) {
                   return file;
                }
            }))),
           fileHandler.getFilenamesWithinFolder(path.normalize(config.locales.rootPath))]); 
        })
        .spread(function(applies, locales ) {
            return Q.all([
                _.map(applies, function(apply) {
                    config.paths.applyFiles.original.push(path.resolve(apply));
                }), 
                _.map(locales, function(locale) {
                    config.paths.locales.original.push(path.resolve(locale));
                }) 
            ]);
        })
        .then(function() {
            return resolve(config);
        })
});
}

function checkPaths(config) {
    return Q.Promise(function(resolve, reject) {
        var allFolders = _.concat(config.applyTo, config.locales.rootPath);
        fileHandler.getFilenamesWithinFolder(path.normalize(config.locales.rootPath))
        .then(function(locales) {
            return Q.all(_.map(locales, function(localeFile) {
                return Q.Promise(function(resolve, reject) {
                    if(!fileHandler.checkExtensions(localeFile, ["json", "gitignore"])) {
                        return reject(new Error("Not all extensions on '" + localeFile +"' match the extensions set"))
                    } else {
                        return resolve();
                    }
                })
            }))
        })
        .then(function() {
            return Q.all(_.map(allFolders, function(folders) { 
                return fileHandler.isAccessible(folders)
                .then(function() {
                    return Q.all(fileHandler.getFilenamesWithinFolder(folders));
                })
            }));
        })
        .then(function(files) {
            return Q.all(_.reject(_.flatten(files), function(file) {
                if(!fileHandler.checkExtensions(file, ["json", "html", "jade", "js"])) {
                   return file; 
                }
            }))
            .then(function(files) {
               return Q.all([_.map(files, function(file) {
                    return fileHandler.isAccessible(file);
               }), files]);
            })
            .spread(function(bool, files) {
                return Q(files);
            })
        })
        .then(function() {
            return resolve(config);
        })
        .fail(function(err) {
            return reject(new Error("Something went wrong checking configuration paths: " + err.message))
        })
    });
}

function checkConfig(config) {
    return Q.Promise(function(resolve, reject) {
        console.log("Checking Attributes...");
        return checkAttributes(config)
        .then(function(config) {
            console.log("Checking Paths and resolving directories...");
            return checkPaths(config);
        })
        .then(function(config) {
            console.log("Resolving entries...");
            return createEntries(config);
        })
        .then(function(config) {
            return resolve(config);
        })
        .fail(function(err)  {
            return reject(new Error("Something went wrong checking the configuration file: " + err.message));
        })
    }); 
}

module.exports = {
    normalizeConfig: function(config) {
        return Q.Promise(function(resolve, reject) {
            console.log("Checking the configuration file...");
            return checkConfig(config)
            .then(function(config) {
                console.log("Configuration file check done!");
                return resolve(config);                
            })
            .fail(function(err) {
                return reject(new Error("Something went wrong normalizing the config: " + err.message));
            });
        });
    }
}