/**
 * tax - simple build tool
 * Copyright(c) 2012 Mihai Tomescu <matomesc@gmail.com>
 * MIT Licensed
 */

var cp = require('child_process')
  , EventEmitter = require('events').EventEmitter
  , fs = require('fs')
  , util = require('util')
  , Seq = require('seq')
  , findit = require('findit');

// might change
var API = ['cp', 'mkdir', 'mv', 'rm', 'lessc', 'hint', 'test'];

exports.Task = Task;
exports.Runner = Runner;
exports.Subtask = Subtask;

function Task(name, description) {
  this.name = name;
  this.desc = description
  this.queue = [];
}

util.inherits(Task, EventEmitter);

merge(Task.prototype, buildProto(), {
  invoke: function (args) {
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
      });
      .seq(function () {
        console.log('%s - ' + 'finished'.bold);
      });
  },
  async: function (fn) {
    this.addSubtask(fn, true);
  },
  sync: function (fn) {
    this.addSubtask(fn, false);
  },
  watch: function (include, exclude) {

  },
  addSubtask: function (fn, async) {
    var subtask = new Subtask(fn, async);
    this.queue.push(subtask);
  },
});

function buildProto() {
  var proto = {};
  API.forEach(function (name) {
    proto[name] = function (fn) {
      var self = this;
      var wrapper = function (cb) {
        if (typeof fn === 'string') {
          cp.exec([name, fn].join(' '), cb);
        } else if (typeof fn === 'function' && fn.length > 0) {
          // fn is an asynch function, pass done as a cb, then exec the result
          function done(err, result) {
            if (Array.isArray(result) {
              result = [].concat.call([name], result);
            }
            cp.exec(result.join(' '), cb);
          }
          fn.call({}, done);
        } else if (typeof fn === 'function' && fn.length === 0) {
          var result = fn.call({});
          cp.exec(result.join(' '), cb);
        } else if (Array.isArray(fn)) {
          var result = [].concat.call([name], result);
          cp.exec(result.join(' '), cb);
        }
      }
      this.addSubtask(wrapper, true);
    };
  });
}

function Subtask(fn, async) {
  this.async = async;
  this.fn = fn;
}

function Runner() {}

//
// utils
//

function merge() {
  var objs = Array.prototype.slice.call(arguments, 1);
  var into = arguments[0];
  objs.forEach(function (obj) {
    Object.keys(obj).forEach(function (key) {
      into[key] = obj[key];
    });
  });
  return into;
}