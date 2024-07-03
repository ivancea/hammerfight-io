import compression from "compression";
import express from "express";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { type SocketIoServerListenEvents } from "../types/socket-io-events";
import { joinPlayer } from "./world";

const SERVER_PORT = 80;

const app = express();
const server = createServer(app);
const io = new Server<SocketIoServerListenEvents>(server);
const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = join(__dirname, "client");

app.use(compression());
app.use(express.static("build"));

app.get("/", (req, res) => {
  res.sendFile(join(clientDir, "index.html"));
});

io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("disconnect", (reason) => {
    console.log(`User disconnected. Reason: ${reason}`);

    // TODO: Handle disconnection. Emit disconnection event, and clear player from room
  });

  socket.on("join", (event, callback) => {
    console.log(`User "${event.username}" joined`);

    const room = joinPlayer(socket, event.username);
    callback(room);
  });
});

server.listen(SERVER_PORT, () => {
  console.log(`Server running at http://localhost:${SERVER_PORT}`);
});
