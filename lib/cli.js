var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    vm = require('vm');

var colors = require('colors'),
    microtime = require('microtime'),
    optimist = require('optimist'),
    Runner = require('./runner');

module.exports = Cli;

function Cli(cwd) {
  this.version = require('../package.json').version;
  this.searchedDirs = [];
  this.cwd = cwd || process.cwd();

  // accepted file names
  this.fileNames = ['tax.js'];

  this.program = optimist(process.argv)
    .usage('tax <task> to execute a task')
    .alias('l', 'list')
    .alias('h', 'help')
    .describe('list', 'list tasks')
    .describe('help', 'show this help menu');

  this.argv = this.program.argv;
  this.taskArgv = optimist([].slice.call(process.argv, 3)).argv;
}

Cli.prototype = {
  start: function () {
    this.hello();

    // fail fast if no file found
    var _path = this.findFile();
    if (!_path) {
      var msg = [
      "can't find tax.js",
      "looked in the following directories:",
      this.searchedDirs.join('\n')].join('\n');
      this.fail(msg);
    }

    // update our cwd to the directory of the file
    this.updateCwd(path.dirname(_path));

    // create a new runner and get tasks
    var runner = new Runner();
    this.execFile(runner, _path);

    if (this.argv.help) {
      return this.program.showHelp();
    } else if (this.argv.list && _path) {
      return runner.listTasks();
    } else if (this.argv._.length >= 3) {
      var taskName = this.argv._[2];
      if (!runner.tasks[taskName]) {
        this.fail('invalid task name %s', taskName);
      } else {
        runner.run(taskName);
      }
    } else {
      return this.program.showHelp();
    }
  },
  // find file recursively starting at _path and going up the tree
  findFile: function findFile(_path) {
    var self = this,
        files = [],
        found = false;
    _path = _path || this.cwd;

    // keep track of where we've been
    self.searchedDirs.push(_path);

    // attempt to read directory at _path
    try {
      files = fs.readdirSync(_path);
    } catch (e) {
      return false;
    }

    // check for valid matches
    files.forEach(function (f) {
      if (!found && self.fileNames.indexOf(f) !== -1) {
        found = f;
      }
    });

    // reached top of the dir tree and still haven't found? we're done
    if (_path === '/' && !found) {
      return false;
    }

    // otherwise keep going
    return found ? path.resolve(_path, found) : findFile(path.resolve(_path, '../'));
  },
  hello: function () {
    console.log("\ntax@%s\n".bold, this.version);
  },
  execFile: function (runner, _path) {
    // add task wrapper around `createTask` to global
    global.task = function task(name, description) {
      return runner.createTask(name, description);
    };
    // create new context using augmented `global`
    var context = vm.createContext(global),
        code = fs.readFileSync(_path, 'utf8');
    // execute the file in the context
    vm.runInContext(code, context, _path);
  },
  updateCwd: function (dir) {
    try {
      process.chdir(dir);
      this.cwd = dir;
    } catch (e) {
      this.fail("can't chdir to %s".red, dir);
    }
  },
  fail: function () {
    console.log.apply(null, Array.prototype.slice.call(arguments));
    process.exit(1);
  }
};