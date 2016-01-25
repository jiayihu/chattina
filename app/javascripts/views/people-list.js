/**
 * People list
 * @module features/people-list
 */

'use strict';

var helpers = require('../helpers');
var pubSub = require('pubsub-js');

var stateMap = {
  button: null,
  peopleList: null
};

/**
 * Subscriber for 'setChatee' event. Selects the new chatee on the list.
 * @param  {string} msg Event name/Topic
 * @param  {object} data Object map with old and new chatee
 */
var _onSetChatee = function(msg, data) {
  var oldChatee = data.oldChatee;
  var newChatee = data.newChatee;

  stateMap.peopleList
    .qs('.person[data-id="' + oldChatee.id + '"]')
    .classList.remove('chatee');
  stateMap.peopleList
    .qs('.person[data-id="' + newChatee.id + '"]')
    .classList.add('chatee');

  return true;
};

//////////////////////
// PUBLIC FUNCTIONS //
//////////////////////

/**
 * Binds the DOM event to controller event listener
 * @param  {string} eventName Name of the event
 * @param  {function} eventHandler Event listener
 * @return {boolean}
 */
var bind = function(eventName, eventHandler) {
  if(eventName === 'setChatee') {
    //event delegation
    stateMap.peopleList.addEventListener('click', function(event) {
      var targetClass = event.target.className;
      var chateeId;

      //User didn't click a person to set the new chatee
      if( ! ~targetClass.indexOf('person') ) {
        return false;
      }

      if(targetClass === 'person') {
        chateeId = event.target.dataset.id;
      } else {
        chateeId = helpers.findParent(event.target, 'person').dataset.id;
      }

      if(!chateeId) {
        return false;
      }

      eventHandler(chateeId);
    });
  }
};

var init = function() {
  stateMap.button = document.getElementsByClassName('toggle-list')[0];
  stateMap.peopleList = document.qs('.content .people-list');

  stateMap.button.addEventListener('click', function() {
    stateMap.peopleList.parentNode.classList.toggle('visible');
  });

  pubSub.subscribe('setChatee', _onSetChatee);
};

module.exports = {
  /** Bind view DOM events to controller event handlers */
  bind: bind,
  /** Init the 'people-list' module */
  init: init
};
