'use strict';

/**
 * Returns fake list of people from server
 * @return {array}
 */
var getPeopleList = function() {
  return [
    {
      name: 'Daenerys',
      _id: 'id_1',
      avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/adellecharles/128.jpg'
    },
    {
      name: 'Jon',
      _id: 'id_2',
      avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/teclaro/128.jpg'
    },
    {
      name: 'Sansa',
      _id: 'id_3',
      avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/brynn/128.jpg'
    },
    {
      name: 'Arya',
      _id: 'id_4',
      avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/nuraika/128.jpg'
    },
    {
      name: 'Cersei',
      _id: 'id_5',
      avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/kfriedson/128.jpg'
    },
    {
      name: 'Joffrey',
      _id: 'id_6',
      avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/jfkingsley/128.jpg'
    }
  ];
};

/**
 * Fake Socket.IO API
 */
var callbackMap = {};
var mockSio = {
  on: function(msgType, callback) {
    callbackMap[msgType] = callback;
  },
  emit: function(msgType, data) {
    if(msgType === 'login' && callbackMap.login) {
      setTimeout(function() {
        callbackMap.login(data);
      }, 1000);
    }
  }
};

module.exports = {
  getPeopleList: getPeopleList,
  mockSio: mockSio
};
