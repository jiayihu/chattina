/**
 * People list
 * @module features/people-list
 */

'use strict';

var helpers = require('../helpers');
var pubSub = require('pubsub-js');

var stateMap = {
  buttonHTML: null,
  peopleList: null
};

var personTemplate =
  '<li class="person {{isChatee}}" data-id="{{id}}">' +
    '<img src="{{avatar}}" alt="{{name}}" class="person__avatar"/>' +
    '<span class="person-details">' +
      '<span class="person__name">{{name}}</span>' +
      '<span class="person__role">{{role}}</span>' +
    '</span>' +
  '</li>';

/**
 * Subscriber for 'setChatee' event. Selects the new chatee on the list.
 * @param  {string} event Event name/Topic
 * @param  {object} argMap Object map with old and new chatee
 * @return {boolean}
 */
var _onSetChatee = function(event, argMap) {
  var oldChatee = argMap.oldChatee;
  var newChatee = argMap.newChatee;
  var oldChateeHTML, newChateeHTML;

  if(oldChatee) {
    oldChateeHTML = stateMap.peopleList.qs('.person[data-id="' + oldChatee.id + '"]');
    if(oldChateeHTML) {
      oldChateeHTML.classList.remove('person--chatee');
    }
  }

  newChateeHTML = stateMap.peopleList.qs('.person[data-id="' + newChatee.id + '"]');
  if(newChateeHTML) {
    newChateeHTML.classList.add('person--chatee');
  }

  return true;
};

/**
 * Subscriber for 'listChange' event. Renders the new people-list and
 * highlights the chatee if defined
 * @param  {string} event Event name/Topic
 * @param  {object} argMap Object map with 'newPeopleDb' and 'chatee'
 */
var _onListChange = function(event, argMap) {
  var newPeopleDb = argMap.newPeopleDb;
  var chatee = argMap.chatee;
  var listHTML = '';
  var person, personHTML, chateeClass;

  for(var cid in newPeopleDb) {
    if(newPeopleDb.hasOwnProperty(cid)) {
      person = newPeopleDb[cid];
      personHTML = personTemplate;
      chateeClass = '';

      if( person.getIsAnon() || person.getIsUser() ) {
        continue;
      }

      if( chatee && chatee.id === person.id ) {
        chateeClass = 'person--chatee';
      }

      personHTML = personHTML.replace(/{{name}}/g, person.name);
      personHTML = personHTML.replace('{{id}}', person.id);
      personHTML = personHTML.replace('{{avatar}}', person.avatar);
      personHTML = personHTML.replace('{{role}}', person.role);
      personHTML = personHTML.replace('{{isChatee}}', chateeClass);

      listHTML += personHTML;
    }
  }

  if(!listHTML) {
    listHTML = 'No one is online.';
  }

  stateMap.peopleList.innerHTML = listHTML;
};

//////////////////////
// PUBLIC FUNCTIONS //
//////////////////////

/**
 * Binds the DOM event to controller event listener
 * @param  {string} eventName Name of the event
 * @param  {function} eventHandler Event listener
 */
var bind = function(eventName, eventHandler) {
  if( (typeof eventName !== 'string') || (typeof eventHandler !== 'function') ) {
    throw new Error('bind() requires eventName to be a string and eventHandler to be a function');
  }

  if(eventName === 'setChatee') {
    //event delegation
    stateMap.peopleList.addEventListener('click', function(event) {
      var targetClass = event.target.classList;
      var chateeId;

      // User didn't click a person to set the new chatee
      // ~ is the single bitwise operator.
      // @see {@url https://developer.mozilla.org/it/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators}
      if( ! ~event.target.className.indexOf('person') ) {
        return false;
      }

      if( targetClass.contains('person') ) {
        chateeId = event.target.dataset.id;
      } else {
        chateeId = helpers.findParent(event.target, 'person').dataset.id;
      }

      if(typeof chateeId !== 'string') {
        return false;
      }

      eventHandler(chateeId);
    });
  }
};

var init = function() {
  stateMap.buttonHTML = document.getElementsByClassName('toggle-list')[0];
  stateMap.peopleList = document.qs('.content .people-list');

  stateMap.buttonHTML.addEventListener('click', function() {
    stateMap.peopleList.parentNode.classList.toggle('visible');
  });

  pubSub.subscribe('setChatee', _onSetChatee);
  pubSub.subscribe('listChange', _onListChange);
};

module.exports = {
  /** Bind view DOM events to controller event handlers */
  bind: bind,
  /** Init the 'people-list' module */
  init: init
};
