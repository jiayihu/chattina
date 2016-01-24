/**
 * Account log-in/out module
 * @module features/account
 */

'use strict';

var pubSub = require('pubsub-js');

var stateMap = {
  account: null,
  sign: null
};

/**
 * PRIVATE FUNCTIONS
 */

var _onAccountLogin = function(msg, currentUser) {
  stateMap.sign.textContent = currentUser.name;
};

var _onAccountLogout = function() {
  stateMap.sign.textContent = 'Please sign-in';
};

/**
 * PUBLIC FUNCTIONS
 */

/**
 * Binds event handlers from shell to DOM events
 * @param  {string} event Name of the event
 * @param  {Function} callback Event handler
 */
var bind = function(event, callback) {
  if(event === 'onSignClick') {
    stateMap.sign.addEventListener('click', callback);
  }
};

var init = function(container) {
  stateMap.account = container;
  stateMap.sign = stateMap.account.getElementsByClassName('sign')[0];

  pubSub.subscribe('login', _onAccountLogin);
  pubSub.subscribe('logout', _onAccountLogout);
};

module.exports = {
  /** bind external event listeners to module DOM events */
  bind: bind,
  /** init account feature */
  init: init
};
