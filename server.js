const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const ACTIONS = require("./src/Actions");
const path = require("path");

const app = express();
const server = http.createServer(app);

app.use(cors());

app.use(express.static('build'));

app.use((req,res,next) => {
    res.sendFile(path.join(__dirname,'build','index.html'));
})

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

 const userSocketMap = {};

 function getAllConnectedClients(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
 }

io.on("connection", (socket) => {
    console.log("socket connected", socket.id);


    socket.on(ACTIONS.JOIN,({roomId,username}) => {
       userSocketMap[socket.id] = username;
       socket.join(roomId);
       const clients = getAllConnectedClients(roomId);

       clients.forEach(({socketId}) => {
        console.log("Username",username);
        io.to(socketId).emit(ACTIONS.JOINED,{
            clients,
            username,
            socketId: socket.id
        })
       }) 
    })

    socket.on(ACTIONS.CODE_CHANGE,({roomId,code}) => {
        console.log(code);
        io.to(roomId).emit(ACTIONS.CODE_CHANGE,{code});
    })

    socket.on("disconnecting",()=>{
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED,{
                socketId : socket.id,
                username : userSocketMap[socket.id]
            })
        })
        delete userSocketMap[socket.id];
        socket.leave();
    })

});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
