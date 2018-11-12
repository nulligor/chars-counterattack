"use strict";
var Q = require("q");
var _ = require("lodash");
var parser = require("./parser");
var applier = require("./applier");
var configHandler = require("./configHandler");
var fileHandler = require("./fileHandler");

function parseLocales(config) {
    return Q.Promise(function(resolve, reject) {
        var mainFile = _.filter(config.paths.locales.original, function(file) {
            return _.includes(file, config.locales.default) ? file : null;
        }).toString();
        var otherFiles = _.filter(config.paths.locales.original, function(file) {
            return file !== mainFile; 
        });
        return parser.parseMain(mainFile, config.types, config.transform, config.defaultType, {
         hasRemoveIdentical: config.hasRemoveIdentical, 
         removeIdentical: config.removeIdentical 
        })
        .then(function(parsedMain) {
            var mirror = _.first(parsedMain);
            var parsed = _.last(parsedMain);
            return parser.parseOther(otherFiles, config.types, config.transform, config.defaultType, mirror, { 
                hasRemoveIdentical: config.hasRemoveIdentical, 
                removeIdentical: config.removeIdentical 
            })
            .then(function(parsedOthers) {
                return resolve([{
                    content: parsed.content,
                    filename: parsed.filename 
                }, parsedOthers]);
            });
        })
        .fail(function(err) {
            return reject(new Error("Something went wrong evoking parse locales function: " + err.message));
        })
    });
}

function applyTo(config, parsedMain, parsedOthers) {
    return Q.Promise(function(resolve, reject) {
       try {
            var applyTo = config.paths.applyFiles.original;
            var originalMain = _.filter(config.paths.locales.original, function(file) {
                return _.includes(file, config.locales.default) ? file : null;
            }).toString(); 
            return resolve(applier.apply(applyTo, parsedMain, parsedOthers, originalMain, config.types, config.defaultType, config.forceCheck));
       } catch(err) {
            return reject(new Error("Something went wrong applying to files: " + err.message));
       }
    });
}

function pipeline(config, callback) {
    return Q.Promise(function(resolve, reject) {
        console.log("Parsing Localization files...");
        return parseLocales(config)
        .then(function(parsedReference) {
            console.log("All localization files successfully parsed!");
            console.log("Parsing files...");
            return applyTo(config, _.first(parsedReference), _.last(parsedReference))
            .then(function(applied) {
                var parsedLocales = _.first(applied);
                var parsedFiles = _.last(applied);
                return Q(_.concat(parsedLocales, parsedFiles));
            })
        })
        .then(function(files) {
            console.log("-------------------------------------------------------------------------------------------------");
            console.log("Logic applying complete, saving files...");
            return Q.all(_.map(files, function(file) {
                return fileHandler.writeToBuffer(file.filename, file.content);
            }));
        })
        .then(function() {
            console.log("All files saved!");
            return resolve();
        })
        .fail(function(err) {
            return reject(new Error("Something went wrong pipelining main functions: " + err.message));
        })
    }); 
}


module.exports = {
    start: function(config) {
        configHandler.normalizeConfig(config)
        .then(function(config) {
            return pipeline(config);
        })
        .then(function() {
            console.log("All steps completed, check the output folder!");
            console.log("It is highly recommended to run git diff before commiting possible changes!");
        })
        .fail(function(err) {
            console.log(err.message);
        });
    }
};