'use strict';

var helpers = require('./helpers');
var model = require('./model');
var page = require('page');
var configMap = {

};

/**
 * PUBLIC FUNCTIONS
 */

var configModule = function(inputMap) {
  helpers.configMap(inputMap, configMap);
};

var init = function() {
  model.init();
};

module.exports = {
  configModule,
  init: init
};
