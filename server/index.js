import express from "express";
import logger from "morgan";
import dotenv from "dotenv";
import { createClient } from "@libsql/client";

import { Server } from "socket.io";
import { createServer } from "node:http";

dotenv.config();

const port = process.env.port ?? 3000;

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 1000,
  },
});

const db = createClient({
  url: "libsql://honest-deathcry-marcebenitez2.turso.io",
  authToken: process.env.DB_TOKEN,
});

await db.execute(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER primary key autoincrement,
    content text,
    user text
  )
`);

// Cuando alguien se conecta automaticamente esto queda a la escucha.

io.on("connection", async (socket) => {
  console.log("New client connected");

  console.log(socket.handshake.auth);

  // Para cuando alguien se desconecta.
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });

  // Para cuando alguien envia un mensaje.
  socket.on('chat message', async (msg) => {
    let result
    const username = socket.handshake.auth.username ?? 'anonymous'
    console.log({ username })
    try {
      result = await db.execute({
        sql: 'INSERT INTO messages (content, user) VALUES (:msg, :username)',
        args: { msg, username }
      })
    } catch (e) {
      console.error(e)
      return
    }

    io.emit('chat message', msg, result.lastInsertRowid.toString(), username)
  })

  // Para cuando alguien se conecta y recupera los mensajes.
  if (!socket.recovered) {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM messages where id > ?`,
        args: [socket.handshake.auth.serverOffset ?? 0],
      });

      result.rows.forEach((row) => {
        socket.emit("chat message", row.content, row.id.toString(), row.user);
      });
    } catch (error) {
      console.log(error);
    }
  }
});

app.use(logger("dev")); // Informacion en la consola.

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/client/index.html");
});

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
