"use strict";
var runner = require("./lib/runner");
var config = require("./configs/config");
var figlet = require('figlet');

console.log("====================== Running Localization Standard Automation Engine ======================");
console.log(figlet.textSync("Char's Counterattack", { font: "Doom" }));
console.log("=================================================================================================")

runner.start(config);
