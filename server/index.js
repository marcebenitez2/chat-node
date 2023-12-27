import express from "express";
import logger from "morgan";
import { Server } from "socket.io";
import { createServer } from "node:http";
import dotenv from "dotenv";
import { createClient } from "@libsql/client";

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
    content text 

  )
`);


// Cuando alguien se conecta automaticamente esto queda a la escucha. 
io.on("connection", async (socket) => {
  console.log("New client connected");
  
  // Para cuando alguien se desconecta.
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });

  // Para cuando alguien envia un mensaje.
  socket.on("chat message", async (msg) => {
    let result;
    try {
      result = await db.execute({
        sql: `INSERT INTO messages (content) VALUES (:content)`,
        args: { content: msg },
      });
    } catch (error) {
      console.error(error);
      return;
    }
    io.emit("chat message", msg, result.lastInsertRowid.toLocaleString());
  });

  // Para cuando alguien se conecta y recupera los mensajes.
  if(!socket.recovered){
     try {
      const result = await db.execute({
        sql: `SELECT * FROM messages WHERE id > ?`,
        args: [0],
      })
     } catch (error) {
      console.log(error)
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
