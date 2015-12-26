'use strict';
var localforage = require('localforage');

/**
 * PUBLIC FUNCTIONS
 */

var init = function() {
  localforage.clear();
};

module.exports = {
  init: init
};
