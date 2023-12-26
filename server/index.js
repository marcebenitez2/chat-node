import express from "express";
import logger from "morgan";
import { Server } from "socket.io";
import { createServer } from "node:http";

const port = process.env.port ?? 3000;

const app = express();
const server = createServer(app);
const io = new Server(server,{
    connectionStateRecovery: {
        maxDisconnectionDuration: 1000,
    }
});

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });

  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });
});

app.use(logger("dev")); // Informacion en la consola.

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/client/index.html");
});

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
