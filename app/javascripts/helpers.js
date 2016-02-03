/**
 * Helpers module
 * @module helpers
 */

var notie = require('notie');

/**
 * Displays an error to the user
 * @param {string} msg Error message
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
  if( (typeof inputMap !== 'object') || (typeof configMap !== 'object') ) {
    throw '"setConfigMap()" requires both "inputMap" and "configMap" objects';
  }

  var key;

  for(key in inputMap) {
    if(configMap.hasOwnProperty(key)) {
      if(inputMap[key] instanceof Object) {
        setConfigMap(inputMap[key], configMap[key]);
      } else {
        configMap[key] = inputMap[key];
      }
    }
  }
};

/**
 * Finds the parent node with given class
 * @param  {Object.HTMLElement} child Element whose parent is looked for
 * @param  {string} parentClass Classname of the parent node
 * @return {Object.HTMLElement}
 */
var findParent = function(child, parentClass) {
  if(!child.parentNode || typeof parentClass !== 'string') {
    return;
  }

  if(child.parentNode.classList.contains(parentClass)) {
    return child.parentNode;
  }

  return findParent(child.parentNode, parentClass);
};

/**
 * Animate the property of a DOM element
 * @param  {Object.HTMLElement} element DOM Element
 * @param  {string} property Property name
 * @param  {number} value Final property value
 * @param  {number} time Animation duration
 */
var animate = function(element, property, value, time) {
  var start;
  var initialValue = element[property];
  if(typeof initialValue !== 'number') {
    throw new Error('"animate()": ' + property + ' cannot be animated.');
  }

  var step = function(timestamp) {
    if(!start) {
      start = timestamp;
    }

    var progress = timestamp - start;
    var tick = time / value;

    element[property] = Math.min(initialValue + progress/tick, value);

    if(progress < time) {
      window.requestAnimationFrame(step);
    }
  };

  window.requestAnimationFrame(step);
};

var init = function() {
  Document.prototype.qs = Document.prototype.querySelector;
  Element.prototype.qs = Element.prototype.querySelector;
};

module.exports = {
  /** Animate a property */
  animate: animate,
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
