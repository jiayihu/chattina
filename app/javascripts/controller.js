/**
 * Controller module.
 * This is the unique master controller, with tiny controllers for each view.
 * Our project is not large scaled, so our controllers can all stay together
 * happily like a family.
 * @module shell
 */

'use strict';

var helpers = require('./helpers');
var model = require('./model');
// var page = require('page');
var pubSub = require('pubsub-js');

/* Views */
var views = {};
views.peopleList = require('./views/people-list');
views.chat = require('./views/chat');
views.account = require('./views/account');

var configMap = {

};
var isTesting = true;

var _testing = function() {
  model.people.login('Alfred');
};


///////////////////////////
// VIEWS EVENTS HANDLERS //
///////////////////////////


/* ACCOUNT */

var _onSignClick = function() {
  var userName;
  var currentUser = model.people.getCurrentUser();

  if(currentUser.getIsAnon()) {
    userName = prompt('Please sign-in');
    if(userName) {
      model.people.login(userName);
      this.textContent = '... Processing ...';
    }
  } else {
    model.people.logout();
  }

  return false;
};


/* PEOPLE LIST */

var onSetChatee = function(personId) {
  model.chat.setChatee(personId);
};


/* CHAT */

var onSubmitMsg = function(msgText) {
  model.chat.sendMsg(msgText);
};


////////////////////////////////////
// RENDERING VIEWS WHEN USER LOGS IN //
////////////////////////////////////


var onLogin = function() {
  //people-list
  views.peopleList.init();
  views.peopleList.bind('setChatee', onSetChatee);

  //chat
  views.chat.init();
  views.chat.bind('submitMsg', onSubmitMsg);
};

/**
 * PUBLIC FUNCTIONS
 */

var configModule = function(inputMap) {
  helpers.configMap(inputMap, configMap);
};

var init = function() {
  //Account
  views.account.init();
  views.account.bind('onSignClick', _onSignClick);

  //People list

  //When user is logged in
  pubSub.subscribe('login', onLogin);

  if(isTesting) {
    _testing();
  }

};

module.exports = {
  /** configures the module configMap */
  configModule: configModule,
  /** init shell module */
  init: init
};
