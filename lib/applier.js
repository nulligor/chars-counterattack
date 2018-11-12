"use strict";
var _ = require("lodash");
var Q = require("q");
var columnify = require("columnify");
var util = require("./util");
var fileHandler = require("./fileHandler");
var readlineSync = require("readline-sync");
var parser = require("./parser");

function keyDetect(content, custom) {
    return Q.Promise(function(resolve, reject) {
        try {
            var regexp = (custom) ? new RegExp(custom) : new RegExp(/\W__[(\s]('(.+?[^\\])'|"(.+?[^\\])")/gi);
            var matches = content.match(regexp);
            return resolve(_.map(matches, function(match) {
            var regexp = (custom) ? new RegExp(custom) : new RegExp(/\W__[(\s]('(.+?[^\\])'|"(.+?[^\\])")/gi);
                var exec = regexp.exec(match); 
                return (exec[3]) ? { value:exec[3], toReplace: exec[0] } : { value: exec[2], toReplace: exec[0] }; 
            }));
        } catch (err) {
            return reject(new Error("Something went wrong when fetching keys from buffered file: " + err.message));
        }
    });
}

function forceKeysDetect(content, filename, forces, prompt) {
    return Q.Promise(function(resolve, reject) {
        if(forces) {
            return Q.all(_.map(forces, function(force) {
                return keyDetect(content, force)
                .then(function(keys) {
                    var actualKeys = _.flatten(keys);
                    if(!_.isEmpty(actualKeys)) {
                        if(!prompt) {
                            return Q(actualKeys);
                        } else {
                            if(readlineSync.keyInYNStrict("Force Check detected " + actualKeys.length + " keys on file: '" + util.pathBase(filename) + "', wish to swap them?")) {
                                return Q(actualKeys);
                            } else {
                                return Q([]);
                            }
                        }
                    } else {
                        return Q([]);
                    }
                });
            }))
            .then(function(allKeys) {
                return resolve(_.uniqBy(_.flatten(allKeys), "toReplace"));
            })
            .fail(function(err) {
                return reject(new Error("Something went wrong when fetching forced keys from buffered file: " + err.message));
            })
        } else {
            return resolve([]);
        }
    });
}

function fetchAllKeys(files, forces) {
    return Q.Promise(function(resolve, reject) {
        return Q.all(_.map(files, function(file) {
            var content = file.content;
            var filename = file.filename;
            return Q.all([keyDetect(content, null), forceKeysDetect(file.content, file.filename, forces, false)])
            .spread(function(keys, forced) {
                return Q(_.concat(keys, forced))
            });
        }))
        .then(function(keys) {
            return resolve(_.uniqBy(_.flatten(keys), "value"));
        })
        .fail(function(err) {
            return reject(new Error("Something went wrong when fetching all keys from buffered file: " + err.message));
        })        
    });
}

function fetchKeys(contents) {
    return Q.Promise(function(resolve, reject) {
        return Q.all(_.map(contents, function(content) {
            return keyDetect(content, null)
        }))
        .then(function(keys) {
            return resolve(_.uniqBy(_.flatten(keys), "value"));
        })
        .fail(function(err) {
            return reject(new Error("Something went wrong when fetching keys from buffered file: " + err.message));
        })        
    });
}

function normalizeFileData(applyTo) {
    return Q.Promise(function(resolve, reject) {
        return Q.all(_.map(applyTo, function(singleApply) {
            return fileHandler.readFileToString(singleApply)
            .then(function(data) {
                return { content: data, filename: singleApply };
            })
        }))
        .then(function(normalized) {
            return resolve(normalized);
        })
        .fail(function(err) {
            return reject(new Error("Something went wrong when normalizing file data: " + err.message));
        });
    })
}

function promptAllKeys(keys, prompt) {
    return Q.Promise(function(resolve, reject) {
        try {
            var reference = [];
            var chunked = _.chunk(_.map(keys, function(k, index) { 
                reference.push(k);
                return { val: k, index: index } 
            }), 3);
            var mappedToOutput = _.map(chunked, function(singleChunk) { 
                return _.reduce(singleChunk, function(result, value, index) {
                    var obj = {};
                    obj['COLUMN - ' + (index + 1)] = value.index + ' - ' + value.val;
                    return _.merge(result, obj);
                }, {}) 
            }); 
            console.log(columnify(mappedToOutput, {truncate: true, align: 'left', columnSplitter: ' |'}));
            if(prompt) {
                var index = readlineSync.question("\nSelect Key: [0 - "+ (reference.length - 1) + "] ", {
                        limit: _.range(0, reference.length),
                        limitMessage: '$<lastInput> is not in the specified range.'
                });
                return resolve(reference[index]);
            } else {
                resolve();
            }
        } catch(err) {
            return reject(new Error("Something went wrong prompting keys: " + err.message));
        }
    });
}

function conflict(keys, parsedMain, parsedOthers, originalMain, types, defaultType) {
    return Q.Promise(function(resolve, reject) {
        var conflicted = [];
        var original = require(originalMain);
        Q.all(_.map(keys, function(key) {
            if(!_.find(original, function(v, k) {
                return k === key.value;
            })) {
                console.log("Couldn't find matching key entry on original localization files for key '" + key.value + "'");
                if(readlineSync.keyInYNStrict("Is this key dynamically set on implementation (key + 'variable')?")) {
                    console.log("Parsing '"+ key.value +"' so it matches parsed data...");
                    console.log(defaultType);
                    return parser.format(key.value, types, defaultType)
                    .then(function(modified) {
                        conflicted.push({from: key.value, to: modified});
                    });
                } else {
                    if(readlineSync.keyInYNStrict("Assign to existing entry?")) {
                        return promptAllKeys(_.sortBy(_.map(parsedMain.content, function(v, k) { return k }), function(k) { return k }), true)
                        .then(function(chosen) {
                            conflicted.push({from: key.value, to: chosen});
                        });
                    } else if(readlineSync.keyInYNStrict("Create new entry?")) {
                        var index = readlineSync.keyInSelect(types, "Select type:", {cancel: false});
                        var newKey = readlineSync.question("Input key name: ", {
                            limit: /^(?!\s*$)/i,
                            limitMessage: 'Sorry, key cannot be empty.'
                        });
                        var keyToWrite = types[index] + "_" + util.camelizeWord(newKey);
                        var value = readlineSync.question("Input '" + keyToWrite + "' value: ", {
                            limit: /^(?!\s*$)/i,
                            limitMessage: 'Sorry, value cannot be empty.'
                        });
                        parsedMain.content[keyToWrite] =  value;
                        _(parsedOthers).forEach(function(element) {
                            element.content[keyToWrite] = value;
                        });
                        conflicted.push({from: key.value, to: keyToWrite});
                  } else {
                        console.log("No action for entry '"+ key.value + "'...");
                  }
                }
            } else {
                var index =_.findKey(parsedMain.content, function(v) {
                    if(!_.isArrayLikeObject(v) && !_.isArrayLikeObject(original[key.value])) {
                        return v.toUpperCase() === original[key.value].toUpperCase();
                    } else {
                        return _.isEqual(v, original[key.value]);                        
                    }
                }); 
                if(!index) {
                    console.log("Couldn't find matching value entry on parsed localization files for key '" + key.value + "'");
                    if(readlineSync.keyInYNStrict("Assign to existing entry?")) {
                        return promptAllKeys(_.sortBy(_.map(parsedMain.content, function(v, k) { return k }), function(k) { return k }), true)
                        .then(function(chosen) {
                            conflicted.push({from: key.value, to: chosen});
                        });
                    } else if(readlineSync.keyInYNStrict("Create new entry?")) {
                        var index = readlineSync.keyInSelect(types, "Select type:", {cancel: false});
                        var newKey = readlineSync.question("Input key name: ", {
                            limit: /^(?!\s*$)/i,
                            limitMessage: 'Sorry, key cannot be empty.'
                        });
                        var keyToWrite = types[index] + "_" + util.camelizeWord(newKey);
                        var value = readlineSync.question("Input '" + keyToWrite + "' value: ", {
                            limit: /^(?!\s*$)/i,
                            limitMessage: 'Sorry, value cannot be empty.'
                        });
                        parsedMain.content[keyToWrite] =  value;
                        _(parsedOthers).forEach(function(element) {
                            element.content[keyToWrite] = value;
                        });
                        conflicted.push({from: key.value, to: keyToWrite});
                  } else {
                        console.log("No action for entry '"+ key.value + "'...");
                  }
                } else {
                    conflicted.push({from: key.value, to: index});
                }
            }  
        }))
        .then(function() {
            return resolve(Q.all([conflicted, parsedMain, parsedOthers]));
        })
        .fail(function(err) {
            return reject(new Error("Something went conflicting keys: " + err.message));
        })
    });
}

function swap(files, swaps, forceCheck) {
    return Q.Promise(function(resolve, reject) {
        return resolve(Q.all(_.map(files, function(file) {
             return Q.Promise(function(resolve, reject) {
                Q.all([keyDetect(file.content, null), forceKeysDetect(file.content, file.filename, forceCheck, true)])
                .spread(function(keys, forced) {
                    return Q(_.concat(keys, forced));
                })
                .then(function(keys) {
                     Q.all(_.map(keys, function(key) {
                        _(swaps).forEach(function(swap) {
                            if(key.value.toUpperCase() === swap.from.toUpperCase()) {
                                var replaceWith = key.toReplace.split(key.value).join(swap.to);
                                file.content = file.content.split(key.toReplace).join(replaceWith);
                            }
                        });   
                     }))
                     .then(function() {
                        return resolve(file);
                     })
                 });
             });          
        })));
    });
}

module.exports = {
    apply: function(applyTo, parsedMain, parsedOthers, originalMain, types, defaultType, forceCheck) {
        return Q.Promise(function(resolve, reject) {
           return normalizeFileData(applyTo)
           .then(function(files) {
                return Q.all([Q(files), (forceCheck) ? fetchAllKeys(files, forceCheck) : fetchKeys(_.map(files,function(v){ return v.content }))]);
           })
           .spread(function(files, keys) {
                console.log("--------------------------------------- Parsed Keys: -----------------------------------------------\n");
                return promptAllKeys(_.sortBy(_.map(parsedMain.content, function(v, k) { return k }), function(k) { return k }), false)
                .then(function() {
                    console.log("-------------------------------------------------------------------------------------------------");
                    return conflict(keys, parsedMain, parsedOthers, originalMain, types, defaultType); 
                })
                .spread(function(conflicted, parsedMain, parsedOthers) {
                    return Q.all([Q(_.concat(parsedMain, parsedOthers)), swap(files, conflicted, forceCheck)]);
                });
           })
           .spread(function(parsedAll, parsedFiles) {
                return resolve([parsedAll, parsedFiles]);
           })
           .fail(function(err) {
               return reject(new Error("Something went wrong applying logic to files: " + err.message));
           })
        });
    }
}    