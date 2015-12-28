'use strict';

var getPeopleList = function() {
  return [
    {
      name: 'Daenerys',
      _id: '1',
      avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/adellecharles/128.jpg'
    },
    {
      name: 'Jon',
      _id: '2',
      avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/teclaro/128.jpg'
    },
    {
      name: 'Sansa',
      _id: '3',
      avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/brynn/128.jpg'
    },
    {
      name: 'Arya',
      _id: '4',
      avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/nuraika/128.jpg'
    },
    {
      name: 'Cersei',
      _id: '5',
      avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/kfriedson/128.jpg'
    },
    {
      name: 'Joffrey',
      _id: '6',
      avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/jfkingsley/128.jpg'
    }
  ];
};

module.exports = {
  getPeopleList: getPeopleList
};
