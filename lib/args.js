/*jshint node:true */
/*

args

Copyright (c) 2013 Ryan Cannon
License: MIT <http://opensource.org/licenses/mit-license>


*/
exports.processArgs = function (args, defaults) {
  var options = {},
    i;
  // if defaults exist, process those first.
  if (defaults) {
    for (i in defaults) {
      if (defaults.hasOwnProperty(i)) {
        options[i] = defaults[i];
      }
    }
  }
  // process the supplied arguments string
  args.forEach(function (arg, index) {
    var aArg = arg.split("="),
      key = aArg.shift(),
      value = aArg.length ? aArg.join("=") : true;

    if (index) { // index 0 is the file name
      options[key] = value;
    }
  });
  return options;
};
