'use strict';

var helpers = require('./helpers');

var configMap = {

};

/**
 * PUBLIC FUNCTIONS
 */

var configModule = function(inputMap) {
  helpers.configMap(inputMap, configMap);
};

var init = function() {

};

module.exports = {
  configModule,
  init: init
};
