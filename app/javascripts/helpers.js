/**
 * [function description]
 * @param  {Function} callback Callback
 */
var $ready = function(callback) {
  if(document.readyState !== 'loading') {
    callback();
  } else {
    document.addEventListener('DOMContentLoaded', callback);
  }
};

/**
 * 	NO JQUERY FUNCTIONS
 */

/**
 * Throws a new Error
 */
var makeError = function(name, msg, data) {
  var error = {};
  error.name = name;
  error.msg = msg;
  if(data) {
    error.data = data;
  }
  console.error(error.msg);
};


/**
 * Set the configMap of the module - It goes deep in the object
 */
var setConfigMap = function(inputMap, configMap) {
  var key;

  for(key in inputMap) {
    if(configMap.hasOwnProperty(key)) {
      if(inputMap[key] instanceof Object) {
        window.setConfigMap(inputMap[key], configMap[key]);
      } else {
        configMap[key] = inputMap[key];
      }
    } else {
      window.makeError('Wrong inputMap', 'Property "' + key + '" is not available in configMap');
    }
  }
};

module.exports = {
  makeError: makeError,
  $ready: $ready,
  setConfigMap: setConfigMap
};
