var optimist = require('optimist');
var Runner = require('./runner');

module.exports = Cli;

function Cli(cwd) {
  this.version = version;
  this.searchedDirs = [];
  this.cwd = cwd || process.cwd();
  this.fileName = ['tax.js'];
}

Cli.prototype = {
  start: function () {
    var t1 = microtime.now();
    console.log("tax@%s", this.version)
    var _path = this.findFile();

    if (!_path) {
      this.fail([
        "can't find tax.js"
      , "looked in the following directories:\n%s"].join('\n')
      , this.searchedDirs.join('\n'));
    }

    var runner = new Runner();
    this.execFile(runner, _path);

    // console.log(util.inspect(runner, true, 20));

    // parse process.argv
    var umm = optimist.alias('l', 'list');
    var argv = umm.argv;
    var taskArgv = optimist.parse([].slice.call(process.argv, 3));

    // runner.createTask('hey', 'ho');
    // runner.createTask('yo', 'son');
    // console.log(process.argv);
    // console.log('argv: %j', argv);
    // console.log('taskArgv: %j', taskArgv);

    if (argv.list && argv._.length === 0) {
      // console.log('yo');
      return runner.listTasks();
    } else if (argv._.length > 0) {
      var taskName = argv._[0];
      if (!runner.tasks[taskName]) {
        fail('invalid task name %s', taskName);
      } else {
        runner.run(taskName);
      }
      console.log('run %s', taskName);
    } else {
      umm.showHelp();
    }
    // console.log(microtime.now() - t1);

    // console.log(path);
    // console.log(this.searchedDirs);
  },
  findFile: function (_path) {
    var self = this;
    _path = _path || this.cwd;
    self.searchedDirs.push(_path);
    var files = [];
    try {
      files = fs.readdirSync(_path);
    } catch (e) {
      return false;
    }
    var found = false;
    files.forEach(function (f) {
      if (!found && self.fileName.indexOf(f) !== -1) {
        found = f;
      }
    });
    if (_path === '/' && !found) {
      return false;
    }
    return found ? path.resolve(_path, found) : this.findFile(path.resolve(_path, '../'));
  },
  execFile: function (runner, _path) {
    global.task = function (name, description) {
      return runner.createTask(name, description);
    }
    var context = vm.createContext(global);
    var code = fs.readFileSync(_path, 'utf8');
    vm.runInContext(code, context, _path);
  },
  updateCwd: function (dir) {
    try {
      process.chdir(dir);
      this.cwd = dir;
    } catch (e) {
      this.fail("can't chdir to %s".red, dir)
    }
  },
  fail: function () {
    console.log.apply(null, Array.prototype.slice.call(arguments));
    process.exit(1);
  }
}