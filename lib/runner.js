var colors = require('colors');
var Task = require('./task').Task;

module.exports = Runner;

function Runner() {
  this.tasks = {};
}

Runner.prototype = {
  //
  // add a new task to the runner and return it
  //
  createTask: function (name, description) {
    this.tasks[name] = new Task(name, description);
    return this.tasks[name];
  },
  listTasks: function () {
    var self = this;
    var lines = Object.keys(this.tasks).map(function (name) {
      var line = [name.white];
      var spaces = '';
      while (20 - name.length - spaces.length) {
        spaces += ' ';
      }
      line.push(spaces);
      line.push(self.tasks[name].desc || '');
      return line.join('');
    });
    console.log(lines.join('\n'));
  },
  run: function (name) {
    this.tasks[name].run();
  }
};