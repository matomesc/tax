var Task = require('./task');

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
      var line = name;
      while (line.length < 20) { line += ' '; }
      line += self.tasks[name] ? self.tasks[name].desc : 'no desc';
      return line;
    });
    console.log(lines.join('\n'));
  },
  run: function (name) {
    this.tasks[name].run();
  }
};