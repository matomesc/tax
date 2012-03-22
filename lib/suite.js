var util = require('util');
var Task = require('./task');

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
  run: function (name, argv, callback) {
    var task = this.tasks[name];
    if (task) {
      return task.run(argv, callback);
    }
    return callback(new Error(util.format('no task called %s exists', name)));
  }
}