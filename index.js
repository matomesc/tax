/**
 * tax - simple build tool
 * Copyright(c) 2012 Mihai Tomescu <matomesc@gmail.com>
 * MIT Licensed
 */
 
var version = exports.version = require('./package.json').version;

exports.Subtask = require('./lib/subtask');
exports.Task = require('./lib/task');
exports.Suite = require('./lib/suite');
exports.Cli = require('./lib/cli');