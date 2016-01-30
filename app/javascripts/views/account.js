/**
 * Account log-in/out module
 * @module features/account
 */

'use strict';

var pubSub = require('pubsub-js');

var stateMap = {
  accountHTML: null,
  signHTML: null
};

/**
 * PRIVATE FUNCTIONS
 */

var _onAccountLogin = function(msg, currentUser) {
  stateMap.signHTML.textContent = currentUser.name;
};

var _onAccountLogout = function() {
  stateMap.signHTML.textContent = 'Please sign-in';
};

//////////////////////
// PUBLIC FUNCTIONS //
//////////////////////

/**
 * Binds event handlers from shell to DOM events
 * @param  {string} eventName Name of the event
 * @param  {Function} eventHandler Event handler
 */
var bind = function(eventName, eventHandler) {
  if( (typeof eventName !== 'string') || (typeof eventHandler !== 'function') ) {
    throw new Error('bind() requires eventName to be a string and eventHandler to be a function');
  }

  if(eventName === 'onSignClick') {
    stateMap.signHTML.addEventListener('click', eventHandler);
  }
};

var init = function() {
  stateMap.accountHTML = document.getElementsByClassName('account')[0];
  stateMap.signHTML = stateMap.accountHTML.getElementsByClassName('sign')[0];

  pubSub.subscribe('login', _onAccountLogin);
  pubSub.subscribe('logout', _onAccountLogout);
};

module.exports = {
  /** bind external event listeners to module DOM events */
  bind: bind,
  /** init account feature */
  init: init
};
