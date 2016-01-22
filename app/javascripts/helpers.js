/**
 * Helpers module
 * @module helpers
 */

var notie = require('notie');

/**
 * Throws a new Error
 */
var makeError = function(msg) {
  notie.alert(3, msg, 4);
};

/**
 * Runs callback function when DOM is ready (JQuery function)
 * @param  {function} callback [description]
 */
var $ready = function(callback) {
  if(document.readyState !== 'loading') {
    callback();
  } else {
    document.addEventListener('DOMContentLoaded', callback);
  }
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

var init = function() {
  Element.prototype.qs = Element.prototype.querySelector;
};

module.exports = {
  /** init helpers module for things like changing DOM prototype*/
  init: init,
  /** Show an error to the user */
  makeError: makeError,
  /** JQuery $.ready function */
  $ready: $ready,
  /** Set the configMap of the module - It goes deep in the object */
  setConfigMap: setConfigMap
};
