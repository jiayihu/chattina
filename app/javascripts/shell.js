'use strict';

var helpers = require('./helpers');
var model = require('./model');
// var page = require('page');
var pubSub = require('pubsub-js');

/* Features */
var account = require('./features/account');

var configMap = {

};
var stateMap = {
  account: null
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
 * FEATURES EVENT HANDLERS
 */


/* ACCOUNT */

var onSignClick = function() {
  var userName;
  var currentUser = model.people.getCurrentUser();

  if(currentUser.getIsAnon()) {
    userName = prompt('Please sign-in');
    model.people.login(userName);
    this.textContent = '... Processing ...';
  } else {
    model.people.logout();
  }

  return false;
};

var onAccountLogin = function(msg, currentUser) {
  stateMap.account
    .getElementsByClassName('sign')[0]
    .textContent = currentUser.name;
};

var onAccountLogout = function() {
  stateMap.account
    .getElementsByClassName('sign')[0]
    .textContent = 'Please sign-in';
};

/**
 * PUBLIC FUNCTIONS
 */

var configModule = function(inputMap) {
  helpers.configMap(inputMap, configMap);
};

var init = function() {
  if(isTesting) {
    testing();
  }

  //Account
  stateMap.account = document.getElementsByClassName('account')[0];
  account.init(stateMap.account);
  account.bind('onSignClick', onSignClick);
  pubSub.subscribe('login', onAccountLogin);
  pubSub.subscribe('logout', onAccountLogout);
};

module.exports = {
  configModule: configModule,
  init: init
};
