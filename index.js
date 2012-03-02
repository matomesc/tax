/**
 * tax - simple build tool
 * Copyright(c) 2012 Mihai Tomescu <matomesc@gmail.com>
 * MIT Licensed
 */
 
var version = exports.version = require('./package.json').version;

exports.Task = require('./lib/task').Task;
exports.Runner = require('./lib/runner');
exports.Subtask = require('./lib/task').Subtask;
exports.Cli = require('./lib/cli');