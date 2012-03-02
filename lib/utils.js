exports.merge = function () {
  var objs = Array.prototype.slice.call(arguments, 1);
  var into = arguments[0];
  objs.forEach(function (obj) {
    Object.keys(obj).forEach(function (key) {
      into[key] = obj[key];
    });
  });
  return into;
};