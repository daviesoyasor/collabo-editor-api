const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const app = express();
const server = http.createServer(app)
const options = {
    cors: {
      origins: "*",
    },
};
const io = socketio(server, options)

app.use(express.static( __dirname + '/public/'));
app.use(express.json())


//handle Single Page Application (SPA)
app.get(/.*/, (req,res)=>{
  res.sendFile(__dirname + '/public/index.html')
})
 
let users = [];
let connectedUsers = [] 
// socket id, username, roomId
// console.log(state.files[0].content);

function getRoomUsers(room) {
    return users.filter(user => user.roomId === room);
  }

  function getDisconnectedUser(socketId) {
    return users.filter(user => user.socketId === socketId); 
  } 
  
 
  io.on("connection", (socket) => {
    socket.on("createjoinRoom", (data)=>{
        socket.join(data.roomId)
        users.push({socketId: socket.id, username: data.username, roomId: data.roomId})
        const username = data.username;

        //welcome current user to the room
        const welcomeMessage = `Welcome to collabo ${username}`;
        io.to(socket.id).emit("welcomeUser", welcomeMessage)

        //notify all users in the room apart from except the current user
        const msg = `${username} just connected`;
        socket.to(data.roomId).emit("notifyRoom", msg)

        //send editor changes to only the people in this room except the sender
        socket.on("emit", (state) => {
            socket.to(data.roomId).emit("broadcast", state);
        });

        //send all users connected to the room to everyone in the room 
        connectedUsers = getRoomUsers(data.roomId)
        io.in(data.roomId).emit('roomUsers', connectedUsers); 

        //when user disconnects
        socket.on("disconnect", ()=>{
          const removedUser = getDisconnectedUser(socket.id)
          let message = `${removedUser[0].username} has disconnected.`
          socket.to(removedUser[0].roomId).emit("userdisconnect", message);
          users = users.filter((user) => user.socketId !== socket.id)
          connectedUsers = getRoomUsers(removedUser[0].roomId)
          io.in(removedUser[0].roomId).emit('roomUsers', connectedUsers); 
      })  
})

 
  });   
server.listen(process.env.PORT || 5500);