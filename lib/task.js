var cp = require('child_process'),
    EventEmitter = require('events').EventEmitter,
    fs = require('fs'),
    util = require('util');

var colors = require('colors'),
    glob = require('glob'),
    microtime = require('microtime'),
    Seq = require('seq'),
    _ = require('underscore');

var Subtask = require('./subtask');

//
// exports
//

module.exports = Task;

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
// create a new task with the given `name` and `description`
//
// a task is basically a container for subtasks which get executed sequentially
//
// events:
// - start
// - error
// - finish
//
function Task(options) {
  EventEmitter.call(this);
  if (!options.name) {
    throw new Error('Task() needs options.name');
  }
  if (!options.cwd) {
    throw new Error('Task() needs options.cwd');
  }
  this.name = options.name;
  this.description = options.description || '';
  this.cwd = options.cwd;
  this.queue = [];
  this.argsCache = {};
  this._running = false;
  this.runtime = 0;
}
util.inherits(Task, EventEmitter);
_.extend(Task.prototype, buildProto(), {
  //
  // runs all of the subtasks in the queue sequentially
  //
  run: function (argv, callback) {
    // prevent duplicate runs
    if (this._running) {
      return;
    }
    this._running = true;

    var self = this,
        queueError = false,
        t1 = Date.now();

    // reset runtime
    self.runtime = 0;

    // handle task arguments
    if (args) {
      self.argsCache = args;
    } else {
      args = self.argsCache;
    }
    // subtask context
    var context = { args: args };

    self.emit('start');
    Seq(this.queue)
      .seqEach(function (subtask) {
        var next = this;
        // handle subtask error
        subtask.on('error', this);
        // record subtask runtime and continue to the next subtask
        subtask.on('finish', function () {
          self.runtime += subtask.runtime;
          return next();
        });
        subtask.run(context, this);
        // console.log((subtask.execCmd ? subtask.execCmd : (subtask.async ? 'async()' : 'sync()')).toString().grey);
      })
      .catch(function (err) {
        self.emit('error');
        queueError = true;
      })
      .seq(function () {
        // console.log(
        //   ['%s'.bold, '-', 'finished'.green, '(%d ms)'.grey].join(' '),
        //   self.name,
        //   (Date.now() - t1));
        self._running = false;
        if (!queueError) {
          self.emit('finish');
        }
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
      var watching = [];

      Seq(include)
        // match the globs
        .parMap(function (_glob, index) {
          var self = this;
          return glob(_glob, function (err, files) {
            return self(err, files);
          });
        })
        .flatten()
        // save the stack
        .seq(function () {
          include = this.stack;
          return this();
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
  //
  // creates a new `Subtask()` with `options` and adds it to the queue
  //
  addSubtask: function (options) {
    var subtask = new Subtask(options);
    this.queue.push(subtask);
    return subtask;
  }
});

//
// builds the task prototype
//

function buildProto() {
  var proto = {};

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
        cmd = [].concat.call([fullName], fn);
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
          return self.exec(cmd);
        };
        return fn.call({}, done);
      }
      self.exec(cmd);
      return self;
    };
  });
  return proto;
}