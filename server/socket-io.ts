import compression from "compression";
import express from "express";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  RemoteSocket,
  Server as SocketIoServer,
  Socket as SocketIoSocket,
} from "socket.io";
import { assert } from "../common/errors";
import { Room } from "../common/types/room";
import {
  SocketIoClientSentEvents,
  SocketIoServerSentEvents,
} from "../common/types/socket-io";

export type SocketData = never;

export type Socket =
  | SocketIoSocket<SocketIoServerSentEvents, never, SocketData>
  | RemoteSocket<SocketIoServerSentEvents, SocketData>;

export type Server = SocketIoServer<
  SocketIoClientSentEvents,
  SocketIoServerSentEvents,
  never,
  SocketData
>;

let io: Server | undefined;

export const server = {
  initialize(port: number) {
    assert(!io, "Socket.IO server already initialized");

    const app = express();
    const server = createServer(app);

    io = new SocketIoServer(server);

    // TODO: Limit requests per second and disconnect players that exceed it

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const clientDir = join(__dirname, "client");

    app.use(compression());
    app.use(express.static("build"));

    app.get("/", (req, res) => {
      res.sendFile(join(clientDir, "index.html"));
    });

    server.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  },

  get io() {
    assert(io, "Socket.IO server not initialized");
    return io;
  },

  addToRoom(socket: Socket, room: Room) {
    assert(io, "Socket.IO server not initialized");
    socket.join(`room:${room.id}`);
  },
  broadcastRoom(room: Room) {
    assert(io, "Socket.IO server not initialized");
    return io.to(`room:${room.id}`);
  },
};
