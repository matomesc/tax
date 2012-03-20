//
// creates a new subtask with `options`
//
module.exports = function Subtask(options) {
  // the `fn` is what gets called when this task is run
  this.fn = options.fn || noop;
  // we need to know if the subtask is sync or not
  this.sync = options.sync || fn.length === 0 || false;
  // does this wrap an exec?
  this.isExec = options.isExec || false;
  // the command we are executing (usually set for execs)
  this.command = options.command || 'a custom Subtask()';
};
Subtask.prototype = {
  //
  // run the subtask in the given `context` and calls `callback` when finished
  //
  run: function (context, callback) {
    var self = this;
    if (self.sync) {
      try {
        // try to run the task
        return callback(null, self.fn.call(context));
      } catch (e) {
        return callback(e);
      }
    }
    // call the async fn passing in `callback`
    return self.fn.call(context, callback);
  }
};

//
// utils
//

function noop() {}