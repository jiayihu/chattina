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

/**
 * Finds the parent node with given class
 * @param  @type {HTMLElement} child Element whose parent is looked for
 * @param  {string} parentClass Classname of the parent node
 * @return @type {HTMLElement}
 */
var findParent = function(child, parentClass) {
  if(!child.parentNode) {
    return;
  }

  if(child.parentNode.classList.contains(parentClass)) {
    return child.parentNode;
  }

  return findParent(child.parentNode, parentClass);
};

var init = function() {
  Document.prototype.qs = Document.prototype.querySelector;
  Element.prototype.qs = Element.prototype.querySelector;
};

module.exports = {
  /** Init helpers module for things like changing DOM prototype*/
  init: init,
  /** Find the parent node with given class */
  findParent: findParent,
  /** Show an error to the user */
  makeError: makeError,
  /** JQuery $.ready function */
  $ready: $ready,
  /** Set the configMap of the module - It goes deep in the object */
  setConfigMap: setConfigMap
};
