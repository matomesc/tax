var util = require('util');
var Task = require('./task');
var colors = require('colors');

module.exports = Suite;

//
// create new `Suite()` with optional `tasks`
//
function Suite(tasks) {
  this.tasks = tasks || {};
}
Suite.prototype = {
  // add a new task to this suite and returns it
  add: function(options) {
    var task = new Task(options);
    this.tasks[options.name] = task;
    return task;
  },
  // runs the task `name`, passing `callback` to the task
  run: function (name, argv) {
    var task = this.tasks[name];
    if (task) {
      task.on('start', function () {
        console.log('%s: '.grey + 'starting'.green, name);
      });
      task.on('finish', function () {
        console.log('%s: '.grey + 'finished '.green + '(%s ms)'.grey, name, task.runtime);
      });
      task.on('error', function (err) {
        throw err;
      });
      return task.run(argv);
    }
  },
}