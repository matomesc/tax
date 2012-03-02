var EventEmitter = require('events').EventEmitter
  , util = require('util')
  , merge = require('./utils').merge
  , Seq = require('seq');

var API = {
  cp: 'cp'
, mkdir: 'mkdir'
, mv: 'mv'
, rm: 'rm'
, lessc: './node_modules/less/bin/lessc'
, hint: './node_modules/jshint/bin/hint'
, test: './node_modules/mocha/bin/mocha'
}

exports.Task = Task;
exports.Subtask = Subtask;

function Task(name, description) {
  this.name = name;
  this.desc = description
  this.queue = [];
}

util.inherits(Task, EventEmitter);

merge(Task.prototype, buildProto(), {
  run: function (args) {
    var self = this;
    Seq(this.queue)
      .seqEach(function (subtask) {
        var next = this;
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
        console.log('%s - ' + 'finished'.bold);
      });
  },
  async: function (fn) {
    this.addSubtask({ fn: fn, async: true });
  },
  sync: function (fn) {
    this.addSubtask({ fn: fn, async: false });
  },
  exec: function (cmd, opts) {
    function wrapper(cb) {
      var defaultOpts = { cwd: process.cwd() };

      // check for no opts
      if (typeof opts === 'function') {
        cb = opts;
        opts = defaultOpts;
      } else {
        opts = merge(defaultOpts, opts);
      }

      if (Array.isArray(cmd)) {
        cmd = cmd.join(' ');
      }

      cp.exec(cmd, opts, cb || noop); 
    }
    this.addSubtask({
        fn: wrapper
      , async: true
      , isExec: true
      , execCmd: cmd
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
  },
});

function buildProto() {
  var proto = {};
  var execOpts = { cwd: process.cwd() };

  Object.keys(API).forEach(function (name) {
    var fullName = API[name];
    proto[name] = function (fn) {
      var self = this;
      var cmd;
      if (typeof fn === 'string') {
        cmd = [fullName, fn].join(' ');
      } else if (typeof fn === 'function' && fn.length > 0) {
        // fn is async, pass done as a cb, then exec the result
        function done(err, cmd) {
          if (err) {
            return cb(err);
          }
          if (Array.isArray(result)) {
            cmd = [].concat.call([fullName], result);
          }
          cmd = cmd.join(' ');
          self.exec(cmd);
        }
        fn.call({}, done);
      } else if (typeof fn === 'function' && fn.length === 0) {
        cmd = [].concat.call([fullName], fn.call({}));
        cmd = cmd.join(' ');
      } else if (Array.isArray(fn)) {
        cmd = [].concat.call([fullName], execOpts, result);
        cmd = cmd.join(' ');
      }
      self.exec(cmd);
      return self;
    };
  });
  return proto;
}

//
// Subtask
//

function Subtask(opts) {
  this.async = opts.async;
  this.fn = opts.fn;
  this.isExec = opts.isExec || false;
  this.execCmd = opts.execCmd || false;
}