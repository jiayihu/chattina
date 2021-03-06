'use strict';

var helpers = require('./helpers');
var model = require('./model');
var shell = require('./controller');

var init = function() {
  helpers.init();
  // helpers.makeError('The app is still in production, not ready for usage. Please have a cookie and come back again later.');

  model.init();
  shell.init();
};

try {
  init();
} catch (error) {
  helpers.makeError('Ops. Something went terribly wrong! Please open an issue on Github.');
  throw error;
}
