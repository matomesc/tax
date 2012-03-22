var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    vm = require('vm');

var colors = require('colors'),
    microtime = require('microtime'),
    optimist = require('optimist');

var Suite = require('./suite');

module.exports = Cli;

function Cli(options) {
  this.version = require('../package.json').version;

  //
  // directory and path stuff
  //

  // the dir of the tax module
  this.taxDir = path.resolve(__dirname, '../');
  // our cwd
  this.cwd = options.cwd || process.cwd();
  // the dir (if any) where a tax file resides
  // this directory is used as the tasks' starting dir
  this.fileDir = '';
  this.filePath = '';
  this.searchedDirs = [];
  // the file names that are valid tax files
  this.fileNames = ['tax.js'];

  //
  // setup optimist
  //
  this.program = optimist(process.argv)
    .usage('tax <task> to execute a task')
    .alias('l', 'list')
    .alias('h', 'help')
    .describe('list', 'list tasks')
    .describe('help', 'show this help menu');
  // grab cli arguments
  this.argv = this.program.argv;
  this.taskArgv = optimist([].slice.call(process.argv, 3)).argv;

  this.suite = new Suite();
}

Cli.prototype = {
  greet: function () {
    console.log("\ntax@%s\n".bold, this.version);
  },
  start: function () {
    // first we must look for a valid task file starting at `this.cwd`
    var filePath = this.find();
    if (!filePath) {
      var msg = [
        "can't find tax.js",
        "looked in the following directories:",
        this.searchedDirs.join('\n')
      ].join('\n');
      return this.fail(msg);
    }
    // grab the directory of the task file
    this.fileDir = path.dirname(filePath);
    // grab tasks
    this.execFile();

    if (this.argv.help) {
      return this.program.showHelp();
    } else if (this.argv.list && _path) {
      return this.listTasks();
    } else if (this.argv._.length >= 3) {
      var taskName = this.argv._[2];
      if (!this.suite.tasks[taskName]) {
        this.fail('invalid task name %s', taskName);
      } else {
        runner.run(taskName);
      }
    } else {
      return this.program.showHelp();
    }
  },
  find: function find(_path) {
    var self = this,
        current = _path || self.cwd,
        files = [],
        found = false;

    do {
      self.searchedDirs.push(current);
      // find files in current dir
      files = fs.readdirSync(current);
      // look for a match
      found = files.filter(function (f) {
        return self.fileNames.indexOf(f) !== -1;
      }).shift() || false;
      // if we found a file in current dir, return the dir
      if (found) {
        return path.resolve(current, found);
      }
      // otherwise cd ../
      if (current !== '/') {
        current = path.resolve(current, '../');
      }
    } while (current !== '/' && !found);

    return found;
  },
  execFile: function () {
    var self = this, context;
    // add wrapper around `this.suite.add()` to `global`
    // this is what the user calls in his task file
    global.task = function task(name, description) {
      var options = {
        name: name,
        description: description,
        cwd: self.fileDir
      };
      // add task to suite and return it
      return self.suite.add(options);
    };
    // create new context using augmented `global`
    context = vm.createContext(global);
    // read task file
    code = fs.readFileSync(this.filePath, 'utf8');
    // execute the file in the context
    vm.runInContext(code, context, this.filePath);
  },
  fail: function () {
    console.log.apply(null, Array.prototype.slice.call(arguments));
    process.exit(1);
  }
};

if (require.main === module) {
  var cli = new Kli();
}