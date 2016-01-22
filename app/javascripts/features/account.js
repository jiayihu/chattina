/**
 * Account log-in/out module
 * @module features/account
 */

'use strict';

var stateMap = {
  account: null,
  sign: null
};

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

var init = function(account) {
  stateMap.account = account;
  stateMap.sign = stateMap.account.getElementsByClassName('sign')[0];
};

module.exports = {
  /** bind external event listeners to module DOM events */
  bind: bind,
  /** init account feature */
  init: init
};
