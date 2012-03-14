var cp = require('child_process'),
    EventEmitter = require('events').EventEmitter,
    fs = require('fs'),
    util = require('util');

var colors = require('colors'),
    glob = require('glob'),
    microtime = require('microtime'),
    Seq = require('seq');

var merge = require('./utils').merge;

//
// exports
//

exports.Task = Task;
exports.Subtask = Subtask;

//
// task api
//

var API = {
  cp: 'cp',
  mkdir: 'mkdir',
  mv: 'mv',
  rm: 'rm',
  lessc: './node_modules/less/bin/lessc',
  hint: './node_modules/jshint/bin/hint',
  test: './node_modules/mocha/bin/mocha'
};

function NOOP () {}

//
// create a new task with the given name and description
// a task is basically a container for the chainable subtasks.
// it executes them sequentially.
//

function Task(name, description) {
  EventEmitter.call(this);
  this.name = name;
  this.desc = description;
  this.queue = [];
  this.argsCache = null;
  this._running = false;
}

util.inherits(Task, EventEmitter);

merge(Task.prototype, buildProto(), {
  //
  // runs all of the subtasks in the queue sequentially
  //
  run: function (args) {
    if (this._running) {
      return;
    }
    var self = this,
        t1 = microtime.now();
    if (args) {
      self.argsCache = args;
    } else {
      args = self.argsCache;
    }
    console.log(['%s'.bold, '-', 'starting'.green].join(' '), self.name);
    self._running = true;
    Seq(this.queue)
      .seqEach(function (subtask) {
        var next = this;
        console.log((subtask.execCmd ? subtask.execCmd : (subtask.async ? 'async()' : 'sync()')).toString().grey);
        if (subtask.async) {
          subtask.fn.call({ args: this.args }, this);
        } else {
          try {
            var result = subtask.fn.call({ args: this.args });
          } catch (err) {
            return next(err);
          }
          return next();
        }
      })
      .catch(function (err) {
        throw err;
      })
      .seq(function () {
        console.log(
          ['%s'.bold, '-', 'finished'.green, '(%d ms)'.grey].join(' '),
          self.name,
          (microtime.now() - t1) / 1000);
        self._running = false;
      });
  },
  //
  // add an asynchronous function to the queue
  //
  async: function (fn) {
    this.addSubtask({ fn: fn, async: true });
    return this;
  },
  //
  // add an synchronous function to the queue
  //
  sync: function (fn) {
    this.addSubtask({ fn: fn, async: false });
    return this;
  },
  //
  // add an exec wrapper around `cmd` and adds it to the queue
  //
  exec: function (cmd, execOpts) {
    function wrapper(cb) {
      var defaultOpts = { cwd: process.cwd() };
      execOpts = execOpts && merge(defaultOpts, execOpts) || defaultOpts;

      if (Array.isArray(cmd)) {
        cmd = cmd.join(' ');
      }

      cp.exec(cmd, execOpts, cb || NOOP);
    }
    this.addSubtask({
        fn: wrapper,
        async: true,
        isExec: true,
        execCmd: cmd
    });
    return this;
  },
  //
  // watch a list of directories and rerun the task if any of the files change
  // the files that are watch is the set complement of `include` and `exclude`
  //
  watch: function (include, exclude) {
    var theTask = this,
        wrapper;

    if (typeof include == 'string') {
      include = [include];
    }
    if (typeof exclude == 'string') {
      exclude = [exclude];
    }

    wrapper = function wrapper(done) {
      var watching = [],
          filesToWatch = [],
          dirsToWatch = [];

      Seq(include)
        // match the globs
        .parMap(function (_glob, index) {
          var self = this;
          return glob(_glob, function (err, files) {
            return self(err, files);
          });
        })
        .flatten()
        // grab files and directory paths
        .parEach(function (_path) {
          return fs.stat(_path, function (err, stats) {
            if (stats.isDirectory()) {
              dirsToWatch.push(_path);
            } else if (stats.isFile()) {
              filesToWatch.push(_path);
            }
            return this(err);
          }.bind(this));
        })
        // save the stack
        .seq(function () {
          include = this.stack;
          console.log('dirsToWatch:\n%j\nfilesToWatch:\n%j\ninclude:\n%j', dirsToWatch, filesToWatch, include);
          this();
        })
        // set the stack to the excludes
        .set(exclude)
        // expand the globs
        .parMap(function (_glob) {
          var self = this;
          return glob(_glob, function (err, files) {
            return self(err, files);
          });
        })
        .flatten()
        // save the stack
        .seq(function () {
          exclude = this.stack;
          console.log('exclude: ', exclude);
          return this();
        })
        // filter the includes and start watching
        .seq(function () {
          watching = include.filter(function (inc) {
            return exclude.indexOf(inc) === -1;
          });
          watching.forEach(function (_path) {
            var watcher = fs.watch(_path, { persistent: true }, function (event, filename) {
              fs.unwatchFile(_path);
              console.log(event, filename);
              if (!theTask._running) {
                theTask.run();
              }
            });
          });
          console.log('watching: ', watching);
          this();
          return done();
        });
    };

    this.addSubtask({
      async: true,
      fn: wrapper
    });

    return this;
  },
  addSubtask: function (opts) {
    var subtask = new Subtask(opts);
    this.queue.push(subtask);
    return subtask;
  }
});

//
// builds the task prototype
//

function buildProto() {
  var proto = {};
  var execOpts = { cwd: process.cwd() };

  Object.keys(API).forEach(function (name) {
    var fullName = API[name];
    proto[name] = function (fn) {
      var self = this,
          cmd;
      if (typeof fn === 'string') {
        cmd = [fullName, fn].join(' ');
      } else if (typeof fn === 'function' && fn.length === 0) {
        cmd = [].concat.call([fullName], fn.call({}));
        cmd = cmd.join(' ');
      } else if (Array.isArray(fn)) {
        cmd = [].concat.call([fullName], execOpts, result);
        cmd = cmd.join(' ');
      } else if (typeof fn === 'function' && fn.length > 0) {
        // fn is async, pass done as a cb, then exec the result
        var done = function done(err, cmd) {
          if (err) {
            return cb(err);
          }
          if (Array.isArray(result)) {
            cmd = [].concat.call([fullName], result);
          }
          cmd = cmd.join(' ');
          self.exec(cmd);
        };
        return fn.call({}, done);
      }
      self.exec(cmd);
      return self;
    };
  });
  return proto;
}

//
// create a new subtask with the given options
//

function Subtask(opts) {
  this.async = opts.async;
  this.fn = opts.fn;
  this.isExec = opts.isExec || false;
  this.execCmd = opts.execCmd || false;
}