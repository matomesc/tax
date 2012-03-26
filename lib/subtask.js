var EventEmitter = require('events').EventEmitter,
    util = require('util');

var _ = require('underscore');

module.exports = Subtask;

//
// creates a new subtask with `options`
//
// a subtask wraps a sync / async fn with a command and timing
// example `options`:
// {
//   fn: function (done) { ... }, // a sync or async function that will get executed
//   async: true,
//   isExec: true,
//   command: 'mkdir -p build'    // a string that describes the cmd that is being `cp.exec'd`
// }
//
// events:
// - start
// - error
// - finish
//
function Subtask(options) {
  EventEmitter.call(this);
  // `this.fn` is what gets called when this task is run
  this.fn = options.fn || noop;
  // we need to know if the subtask is sync or not
  this.async = options.async || this.fn.length !== 0 || false;
  // does this wrap an exec?
  this.isExec = options.isExec || false;
  // the command we are executing (always set for execs)
  this.command = options.command || 'a custom Subtask()';
  // the time the last execution of `this.fn` took
  this.runtime = 0;
}
util.inherits(Subtask, EventEmitter);
_.extend(Subtask.prototype, {
  //
  // run the subtask in the given `context`
  //
  run: function (context) {
    var self = this,
        t1 = Date.now();
    self.emit('start');
    // `this.fn` is sync
    if (!self.async) {
      try {
        // try to run the task
        var result = self.fn.call(context);
        // save runtime
        self.runtime = Date.now() - t1;
        return self.emit('finish');
      } catch (e) {
        return self.emit('error', e);
      }
    }
    // `this.fn` is async - call fn, saving the runtime then calling `callback`
    return self.fn.call(context, function (err) {
      if (err) {
        return self.emit('error', err);
      }
      // slice arguments past err
      var result = [].slice.call(arguments, 1);
      // save runtime
      self.runtime = Date.now() - t1;
      return self.emit('finish');
    });
  }
});