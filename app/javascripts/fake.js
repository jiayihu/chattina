/**
 * Fake back-end module
 * @module fake
 */

'use strict';

/**
 * Returns fake list of people from server
 * @return {array}
 */
var peopleList = [
  {
    name: 'Daenerys',
    _id: 'id_1',
    avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/pixeliris/128.jpg',
    role: 'guest'
  },
  {
    name: 'Jon',
    _id: 'id_2',
    avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/teclaro/128.jpg',
    role: 'guest'
  },
  {
    name: 'Sansa',
    _id: 'id_3',
    avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/brynn/128.jpg',
    role: 'guest'
  },
  {
    name: 'Arya',
    _id: 'id_4',
    avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/nuraika/128.jpg',
    role: 'guest'
  },
  {
    name: 'Cersei',
    _id: 'id_5',
    avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/kfriedson/128.jpg',
    role: 'guest'
  },
  {
    name: 'Joffrey',
    _id: 'id_6',
    avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/jfkingsley/128.jpg',
    role: 'guest'
  }
];

/**
 * Fake Socket.IO API
 */
var fakeIdSerial = 6;
var callbackMap = {};
var timeoutID;

var _makeFakeId = function() {
  return 'id_' + String(fakeIdSerial+=1);
};

/**
 * Tries to send a fake msg to the client every 4s until success
 * @param {string} msgText text content
 */
var emitMockMsg = function(msgText) {
  window.setTimeout(function() {
    if(callbackMap.updateChat) {
      callbackMap.updateChat({
        destId: 'id_7',
        destName: 'Alfred',
        senderId: 'id_4',
        msgText: msgText
      });
    } else {
      emitMockMsg();
    }
  }, 1000);
};

window.emitMockMsg = emitMockMsg;

/**
 * Tries to send a fake new peopleList to the client every 1s until success.
 * This should be successful only after user has logged in.
 */
var sendListChange = function() {
  timeoutID = window.setTimeout(function() {
    if(callbackMap.listChange) {
      callbackMap.listChange(peopleList);
      emitMockMsg('Hi there from Arya!');
      window.clearTimeout(timeoutID);
    } else {
      sendListChange();
    }
  }, 500);
};

/**
 * Mock Socket.IO
 * http://socket.io
 * @type {Object}
 */
var mockSio = {
  on: function(msgType, callback) {
    callbackMap[msgType] = callback;
  },
  emit: function(msgType, data) {
    if(msgType === 'addUser' && callbackMap.userUpdate) {
      setTimeout(function() {
        var person = {
          _id: _makeFakeId(),
          name: data.name,
          avatar: data.avatar
        };

        //Add the new user to the list. This is applied also when user logs in.
        peopleList.push(person);
        callbackMap.userUpdate([person]);
        sendListChange();
      }, 1000);
    }

    if(msgType === 'updateAvatar' && callbackMap.listChange) {
      var i = 0;
      for(i = 0; i < peopleList.length; i+=1) {
        if(peopleList[i]._id === data.personId) {
          peopleList[i].avatar = data.avatar;
        }
      }

      callbackMap.listChange(peopleList);
    }

    if(msgType === 'updateChat' && callbackMap.updateChat) {
      setTimeout(function() {
        if(data.senderId !== 'id_' + fakeIdSerial) {
          callbackMap.updateChat(data);
        }
      }, 2000);
    }

    if(msgType === 'leaveChat') {
      delete callbackMap.listChange;
      delete callbackMap.updateChat;

      sendListChange();
    }

  }
};

var init = function() {
  // sendListChange();
};

module.exports = {
  /** init the module*/
  init: init,
  /** Mock Socket.IO */
  mockSio: mockSio
};
