import compression from "compression";
import express from "express";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import {
  handleEvent,
  zodLoginEvent,
  type SocketIoServerListenEvents,
} from "./types/socket-io-events";

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
  socket.on(
    "join",
    handleEvent(zodLoginEvent, (event) => {
      console.log(`User "${event.username}" joined`);
    }),
  );
});

server.listen(80, () => {
  console.log("server running at http://localhost:3000");
});
