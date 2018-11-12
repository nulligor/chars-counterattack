"use strict";
var path = require("path");
module.exports = {
    camelizeWord: function(word) {
        return word.replace(/(?:^\w|[A-Z]|\b\w)/g, function(letter, index) {
            return letter.toUpperCase();
        }).replace(/\s+/g, '');
    },
    pathBase: function(filePath) {
       return path.parse(filePath).base;
    }
};