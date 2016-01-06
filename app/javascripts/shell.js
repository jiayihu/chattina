'use strict';

var helpers = require('./helpers');
var model = require('./model');
var page = require('page');
var pubSub = require('pubsub-js');

var configMap = {

};
var isTesting = false;

var testing = function() {
  pubSub.subscribe('login', function(msg, data) {
    console.log(msg + ': ');
    console.log(data);
  });
  pubSub.subscribe('logout', function(msg, data) {
    console.log(msg + ': ');
    console.log(data);
  });
};

/**
 * PUBLIC FUNCTIONS
 */

var configModule = function(inputMap) {
  helpers.configMap(inputMap, configMap);
};

var init = function() {
  model.init();
  if(isTesting) {
    testing();
  }
  //helpers.makeError('The app is still in production, not ready for usage. Please have a cookie and come back again later.');
};

module.exports = {
  configModule: configModule,
  init: init
};
