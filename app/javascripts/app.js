'use strict';

var helpers = require('./helpers');
var model = require('./model');
var shell = require('./shell');

var init = function() {
  helpers.init();
  model.init();
  shell.init();
};

module.exports = {
  init: init
};
