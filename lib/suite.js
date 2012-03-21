var EventEmitter = require('events').EventEmitter,
    util = require('util');
var colors = require('colors'),
    _ = require('underscore');
var Task = require('./task');

module.exports = Suite;

//
// create new `Suite()` with optional `tasks`
//
function Suite(tasks) {
  this.tasks = tasks || {};
}
util.inherits(Suite, EventEmitter);
_.extend(Suite.prototype, {
  // add a new task to this suite
  add: function(name, description) {
    var task = new Task(name, description);
    this.tasks[name] = task;
    return this;
  },
  // emits `error` event indicating something went wrong
  // `err` should be an `Error` object
  fail: function (err) {
    this.emit('error', err || new Error());
  },
  // runs the task called `name`
  run: function (name) {
    var self = this,
        task = this.tasks[name];
    if (!task) {
      return this.fail(util.format('no task called %s exists', name));
    }
    task.on('error', function (err) {
      self.fail('error', err);
    });
    task.run();
    return this;
  }
});