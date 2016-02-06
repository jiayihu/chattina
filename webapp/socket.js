'use strict';

var peopleList = require('./model/people-list.js');

////////////////////
// EVENT HANDLERS //
////////////////////

var _onAddUser = function(io, socket, user) {
  user.socketId = socket.id;
  var newUser = peopleList.add([user]);

  console.log('addUser(): %j', newUser);

  socket.emit('userUpdate', newUser);
  setTimeout(function() {
    console.log('Online users:\n');
    console.log(peopleList.getList());
    io.emit('listChange', peopleList.getList());
  }, 1000);
};

var _onLeaveChat = function(io, socket) {
  console.log('leaveChat: %s', socket.id);
  var oldUser = {
    socketId: socket.id
  };

  var isRemoved = peopleList.remove([oldUser]);
  if(isRemoved) {
    io.emit('listChange', peopleList.getList());
  }
};

var _onUpdateChat = function(io, socket, msg) {
  console.log('updateChat(): %j', msg);

  var destSocketId = peopleList.getById(msg.destId).socketId;
  if(destSocketId) {
    socket.broadcast.to(destSocketId).emit('updateChat', msg);
  }
};

var _onUpdateAvatar = function(io, socket, avatarMap) {
  console.log('updateAvatar: ' + avatarMap);
};

/**
 * Configure socket.io
 * @param  {object} server Node http server
 */
var init = function(server) {
  var io = require('socket.io')(server);

  io.on('connection', function(socket) {
    console.log('User connected to socket.');
    
    socket.on('addUser', function(user) {
      _onAddUser(io, socket, user);
    });

    socket.on('disconnect', function() {
      _onLeaveChat(io, socket);
    });

    socket.on('leaveChat', function() {
      _onLeaveChat(io, socket);
    });

    socket.on('updateChat', function(msg) {
      _onUpdateChat(io, socket, msg);
    });
    socket.on('updateAvatar', function(avatarMap) {
      _onUpdateAvatar(io, socket, avatarMap);
    });
  });
};

module.exports = {
  init: init
};
