var cp = require('child_process'),
    EventEmitter = require('events').EventEmitter,
    util = require('util');

var microtime = require('microtime'),
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
}

util.inherits(Task, EventEmitter);

merge(Task.prototype, buildProto(), {
  run: function (args) {
    var self = this;
    var t1 = microtime.now();
    console.log('%s'.bold + ' - starting', self.name);
    Seq(this.queue)
      .seqEach(function (subtask) {
        var next = this;
        console.log(subtask.execCmd ? subtask.execCmd : (subtask.async ? 'async()' : 'sync()'));
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
        console.log('%s'.bold + ' - finished ' + '(%d ms)'.grey, self.name, (microtime.now() - t1) / 1000);
      });
  },
  async: function (fn) {
    this.addSubtask({ fn: fn, async: true });
    return this;
  },
  sync: function (fn) {
    this.addSubtask({ fn: fn, async: false });
    return this;
  },
  // adds an exec wrapper around a cmd and adds it to the queue
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
  watch: function (include, exclude) {
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