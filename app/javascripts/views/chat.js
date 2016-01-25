/**
 * Chat module
 * @module features/chat
 */

'use strict';

var stateMap = {
  msgsHTML: null,
  sendFormHTML: null
};

///////////////////////
// PRIVATE FUNCTIONS //
///////////////////////

/**
 * Appends the new msg to the chat
 * @param  {string} personName Msg sender's name
 * @param  {string} text Content of the msg
 * @param  {Boolean} isUser Is msg sent by user
 */
var _writeChat = function(personName, text, isUser) {
  var msgClass = isUser? 'msg--sent' : 'msg--received';
  var msgHTML = document.createElement('li');
  var lastMsgWrapper = stateMap.msgsHTML.lastElementChild; // in sequence msgs are wrapped (see HTML)

  msgHTML.textContent = text;

  /*
   * Group in sequence msgs to the same 'ul' list if the sender is always the
   * same.
   */
  if(lastMsgWrapper.classList.contains(msgClass)) {
    lastMsgWrapper.appendChild(msgHTML);
  } else {
    var newMsgWrapper = document.createElement('ul');

    newMsgWrapper.classList.add('msg');
    newMsgWrapper.classList.add(msgClass);
    newMsgWrapper.appendChild(msgHTML);
    stateMap.msgsHTML.appendChild(newMsgWrapper);
  }

};

/**
 * Appends system alert msg to the chat
 * @param  {string} alertText Alert text
 */
var _writeAlert = function(alertText) {
  var newMsgWrapper = document.createElement('ul');
  var msgHTML = document.createElement('li');

  msgHTML.textContent = alertText;

  newMsgWrapper.classList.add('msg');
  newMsgWrapper.classList.add('msg--alert');
  newMsgWrapper.appendChild(msgHTML);
  stateMap.msgsHTML.appendChild(newMsgWrapper);

};

/**
 * Empty the chat log
 */
var _clearChat = function() {
  while(stateMap.msgsHTML.lastChild) {
    //Performs better than .innerHTML = ''. @see {@link http://stackoverflow.com/a/3955238}
    stateMap.msgsHTML.removeChild(stateMap.msgsHTML.lastChild);
  }
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
  if(eventName === 'submitMsg') {
    stateMap.sendFormHTML = stateMap.msgsHTML.nextElementSibling;
    stateMap.sendFormHTML.addEventListener('submit', function(event) {
      event.preventDefault();
      var msgText = this.getElementsByClassName('box__input')[0].value;

      if(msgText.trim() === '') {
        return false;
      }
      eventHandler(msgText);

      return true;
    });
  }
};

var init = function() {
  stateMap.msgsHTML = document.qs('.chat .msgs');
};

module.exports = {
  /** Bind view DOM events to controller event handlers */
  bind: bind,
  /** Init the chat module */
  init: init
};
