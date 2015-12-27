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
  helpers.makeError('The app is still in production, not ready for usage. Please have a cookie and come back again later.');
};

module.exports = {
  configModule: configModule,
  init: init
};
