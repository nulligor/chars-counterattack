"use strict";
var util = require("./util");
var path = require("path");
var Q = require("q");
var _ = require("lodash");
var readlineSync = require("readline-sync");

function removeIdenticalPairs(content, filename, remIdentical) {
    return Q.Promise(function(resolve, reject) {
        try {
            var parsedContent = _.mapKeys(content, function(value, key) {
                    if(!_.isArrayLikeObject(value)) {
                        if(key === "undefined" || value === "undefined" || key === "[object Object]" || value === "[object Object]") {
                            delete content.key
                        } else {
                            if(!remIdentical.hasRemoveIdentical) {
                                if(key.toUpperCase() === value.toUpperCase() && readlineSync.keyInYNStrict("\nCURRENTLY ON FILE: '" + filename + "'" +"\nRepeated key: value pair found in " + key + ": "+ value +"\nDelete the entry? (Otherwise the key is gonna be formatted)")) {
                                    delete content.key;
                                } else {
                                    return key;
                                } 
                            } else {
                                if(key.toUpperCase() === value.toUpperCase() && remIdentical.removeIdentical) {
                                    delete content.key;
                                } else {
                                    return key;
                                } 
                            }
                        }
                    } else {
                        return key
                    }
            });
            return resolve(_.omit(parsedContent, undefined));
        } catch(err) {
            return reject(new Error("Something went wrong removing identical pairs: " + err.message));
        }
    });
}

function removeDuplicateValues(content, filename) {
    return Q.Promise(function(resolve, reject) {
      try {
            var duplicateKeys = _.reduce(content, function(result, value, key) {
                if(!_.isArrayLikeObject(value)) {
                    (result[value] || (result[value] = [])).push(key);  
                }   
                return result
            }, {});
            var keysToRemove = _.reduce(duplicateKeys, function(result, keys, value) {
                if(keys.length >= 2) {
                    if(!value.length === 0 || value.trim()) {
                        console.log("\nCURRENTLY ON FILE: '" + filename + "'");
                        console.log("Multiple key entries for value '" + value +"'\nChoose one of the keys bellow: (All other keys are gonna be deleted)");
                        var index = readlineSync.keyInSelect(keys, "Select key", {cancel: "Keep all"});
                        if(index > -1) {
                            _.pullAt(keys,index);
                            result.push(keys);
                        }
                    }
                } 
                return _.flatten(result);
            }, []);        
            var parsedContent = _.mapKeys(content, function(value, key) {
                if(keysToRemove.indexOf(key.toString()) >= 0) {
                    delete content.key
                } else {
                    return key
                }
            });
            return resolve(_.omit(parsedContent, undefined));
      } catch(err) {
        return reject(new Error("Something went wrong removing duplicate values: " + err.message));
      }
    });
}

function format(word, types, defaultType, filename) {
    return Q.Promise(function(resolve, reject) {
        Q.all(_.map(types, function(type) {
            return (word.match(new RegExp('^' + type + '_[^*]+$', 'g'))) ? true : false; 
        }))
        .then(function(booleanArray) {  
            if(!_.some(booleanArray)) {
                return Q.all(_.map(types, function(type) {
                    return (word.match(new RegExp('^' + type + '[^*]+$', 'g'))) ? true : false; 
                }))
                .then(function(booleanArray) {
                    if(!_.some(booleanArray)) {
                        if(defaultType) {
                            return resolve(defaultType + '_'+ util.camelizeWord(word));
                        } else {
                            if(filename) {
                                console.log("\nCURRENTLY ON FILE: '" + filename + "'");
                            } 
                            console.log("No valid type detected for key '" + word +"', choose one of the types bellow:");
                            var index = readlineSync.keyInSelect(types, "Select type", {cancel: false});
                            return resolve(types[index] + '_'+ util.camelizeWord(word));
                        }
                    } else {
                        var toRemove  = _.map(types, function(type) {
                            if(word.match(new RegExp('^' + type + '[^*]+$', 'g'))) {
                                return type + '_'+ util.camelizeWord(word.split(type).join(''));
                            }
                        }); 
                        return resolve(_.remove(toRemove, function(element) {
                            return element !== undefined;
                        }).toString());
                    }
                });
            } else {
                return resolve(word);
            }
        })
        .fail(function(err) {
            return reject(new Error("Something went wrong applying type formatting: " + err.message));
        }); 
    });
}

function transform(word, transformations, defaultType, filename) {
    return Q.Promise(function(resolve, reject) {
        Q.all(_.map(transformations, function(transform) {
            if(word.match(new RegExp('^' + transform.from + '[^*]+$', 'g'))) {
                return word.split(transform.from).join(transform.to);    
            }
        }))
        .then(function(mapped) {
            return resolve(_.remove(mapped, function(element) {
                return element !== undefined;
            }));
        })
        .fail(function(err) {
            return reject(new Error("Something went wrong applying type transformation: " + err.message));
        });
    });
}

function apply(fn, content, modifier, defaultType, filename) {
    return Q.Promise(function(resolve, reject) {
        Q.all([ Q.all( _.map(content, function(value, key) {
            return fn(key, modifier, defaultType, filename)
            .then(function(modified) {
                if(modified) {
                    return { original: key, modified: modified.toString() };
                }  
            })
        })), content])
        .spread(function(modifiedKeys, content) {
            var removed = _.remove(modifiedKeys, function(element) {
                return element !== undefined;
            });  
            return resolve(_.mapKeys(content, function(value, key) {
                var mapped = _.map(removed, function(single) {
                    if(single.original == key) {
                        return single.modified;
                    }
                });
                var filtered = _.remove(mapped, function(element) {
                    return element !== undefined;
                }).toString();
                return (filtered) ? filtered : key;
            }));
        })
        .fail(function(err) {
            return reject(new Error("Something went wrong applying " + fn.name + ": " + err.message));
        });
    });
}

function parse(content, types, transformations, defaultType, filename, remIdentical) {
    return Q.Promise(function(resolve, reject) {
        removeIdenticalPairs(content, filename, remIdentical)
        .then(function(content) {
            if(transformations.length >= 1) {
                console.log("Parsing Transformations..");
                console.log("-------------------------------------------------------------------------------------------------");
                return apply(transform, content, transformations);
            } else {
                return Q(content);
            }
        })
        .then(function(content) {
            return apply(format, content, types, defaultType, filename);
        })
        .then(function(content) {
            console.log("Parsing Duplicate Entries...");
            console.log("-------------------------------------------------------------------------------------------------");
            return removeDuplicateValues(content, filename);
        })
        .then(function(parsedContent) {
            return resolve({parsed: parsedContent, original: content});
        })
        .fail(function(err) {
            return reject(new Error("Something went wrong applying logic to files: " + err.message));
        });
    });
}

function generateMirror(parsedContent, originalContent) {
    return Q.Promise(function(resolve, reject) {
       try {
            var mirror = {
                iterations: [],
                deletions: []
            };
            var identical = _.omit(_.mapKeys(originalContent, function(value, key) {
                if(!_.isArrayLikeObject(value)) {
                    if(key.toUpperCase() === value.toUpperCase()) {
                        return key;
                    }  
                } else {
                    return key
                }
            }), undefined);
            _(parsedContent).forEach(function(parsedValue, parsedKey) {
                _(originalContent).forEach(function(originalValue, originalKey) {
                    if(parsedValue === originalValue) {
                        mirror.iterations.push({ original: originalKey, parsed: parsedKey });
                    } 
                });
            });
            _(identical).forEach(function(identicalValue, identicalKey) {
                if(_.indexOf(_.map(parsedContent,function(v) { return v }), identicalValue) < 0 ) {
                    mirror.deletions.push(identicalKey);
                }
            });  
            return resolve(mirror);
       } catch(err) {
           return reject(new Error("Something went wrong generating mirror: " + err.message));
       }
    });
}

function applyMirror(content, mirror, remIdentical, defaultType) {
    return Q.Promise(function(resolve, reject) {
        _(mirror.deletions).forEach(function(singleKey) {
            delete content[singleKey];
        });
        if(!remIdentical.hasRemoveIdentical && !defaultType) {
            return resolve(_.mapKeys(content, function(value, key) {
                var mirrorEntry = _.filter(mirror.iterations, { original: key });
                if(!_.isEmpty(mirrorEntry)) {
                    return mirrorEntry[(mirrorEntry.length - 1)].parsed;
                } else {
                    return key;
                }            
            })); 
        } else {
            return resolve(content);
        }
    });
}

module.exports = {
    parseMain: function(file, types, transformations, defaultType, remIdentical) {
        return Q.Promise(function(resolve, reject) {
            var content = require(path.relative(__dirname, file));
            return parse(content, types, transformations, defaultType, util.pathBase(file), remIdentical)
            .then(function(appliedLogic) {
                return Q.all([generateMirror(appliedLogic.parsed, appliedLogic.original), { content: appliedLogic.parsed, filename: file }]);
            })
            .spread(function(mirror, content) {
                return resolve([mirror, content]);
            })
            .fail(function(err) {
                return reject(new Error("Something went wrong parsing the main file: " + err.message));
            });
        });
    },
    parseOther: function(files, types, transformations, defaultType, mirror, remIdentical) {
        return Q.Promise(function(resolve, reject) {
            return Q.all(_.map(files, function(file) {
                var content = require(path.relative(__dirname, file));
                return Q.all([applyMirror(content, mirror, remIdentical, defaultType), file]);
            }))
            .then(function(mirroredContents) {
                return Q.all(_.map(mirroredContents, function(singleInstance) {
                    return Q.all([parse(_.first(singleInstance), types, transformations, defaultType, util.pathBase(_.last(singleInstance)), remIdentical), _.last(singleInstance)]);
                }));
            })
            .then(function(parsedContents) {
                return Q.all(_.map(parsedContents, function(singleInstance) {
                    return { content: _.first(singleInstance).parsed, filename: _.last(singleInstance)};
                }))
           })
           .then(function(toWrite) {
                return resolve(toWrite);     
           })
           .fail(function(err) {
                return reject(new Error("Something went wrong parsing other files: " + err.message));
           });
        });
    },
    format: function(word, types, defaultType) {
        return format(word, types, defaultType, null);
    }
};