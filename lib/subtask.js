var EventEmitter = require('events').EventEmitter,
    util = require('util');

var _ = require('underscore');

//
// creates a new subtask with `options`
// a subtask wraps a sync / async fn with a command and timing
// example `options`:
// {
//   fn: function (done) { ... }, // a sync or async function that will get executed
//   async: true,
//   isExec: true,
//   command: 'mkdir -p build'    // a string that describes the cmd that is being `cp.exec'd`
// }
module.exports = function Subtask(options) {
  // `this.fn` is what gets called when this task is run
  this.fn = options.fn || noop;
  // we need to know if the subtask is sync or not
  this.async = options.async || fn.length !== 0 || false;
  // does this wrap an exec?
  this.isExec = options.isExec || false;
  // the command we are executing (always set for execs)
  this.command = options.command || 'a custom Subtask()';
  // the time the last execution of `this.fn` took
  this.runtime = null;
};
util.inherits(Subtask, EventEmitter);
_.extend(Subtask.prototype, {
  //
  // run the subtask in the given `context` and calls `callback` when finished
  //
  run: function (context, callback) {
    var self = this,
        t1 = Date.now();
    if (self.sync) {
      try {
        // try to run the task
        var result = self.fn.call(context);
        // save `this.runtime`
        self.runtime = Date.now() - t1;
        return callback(null, result);
      } catch (e) {
        return callback(e);
      }
    }
    // call fn, saving the runtime then calling `callback`
    return self.fn.call(context, function (err) {
      if (err) {
        return callback(err);
      }
      // slice whatever was passed
      var result = [].slice.call(arguments, 1);
      self.runtime = Date.now() - t1;
      return callback.apply(null, null, result);
    });
  }
});

//
// utils
//

function noop() {}