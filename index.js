/**
 * tax - simple build tool
 * Copyright(c) 2012 Mihai Tomescu <matomesc@gmail.com>
 * MIT Licensed
 */
 
var version = exports.version = require('./package.json').version;


exports.Subtask = require('./lib/subtask');
exports.Task = require('./lib/task');
exports.Runner = require('./lib/runner');
exports.Cli = require('./lib/cli');