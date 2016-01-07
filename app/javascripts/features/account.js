'use strict';

var stateMap = {
  account: null,
  sign: null
};


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
  bind: bind,
  init: init
};
