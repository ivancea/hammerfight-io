import compression from "compression";
import express from "express";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import type {
  SocketIoClientSentEvents,
  SocketIoServerSentEvents,
} from "../types/socket-io-events";
import { roomBroadcastGroup } from "./socket-io-groups";
import { disconnectPlayer, getPlayer, getRoom, joinPlayer } from "./world";

const SERVER_PORT = 80;

const app = express();
const server = createServer(app);
const io = new Server<SocketIoClientSentEvents, SocketIoServerSentEvents>(
  server,
);
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

    const player = getPlayer(socket);
    const room = getRoom(player);

    io.to(roomBroadcastGroup(room)).emit("playerLeft", { player });

    disconnectPlayer(player);
  });

  socket.on("requestJoin", (event, callback) => {
    console.log(`User "${event.username}" joined`);

    const { room, player } = joinPlayer(socket, event.username);

    callback(room, player);

    io.to(roomBroadcastGroup(room)).emit("playerJoined", { player });
  });
});

server.listen(SERVER_PORT, () => {
  console.log(`Server running at http://localhost:${SERVER_PORT}`);
});
