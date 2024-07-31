import compression from "compression";
import express from "express";
import http from "node:http";
import https from "node:https";
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
import { joinUrl } from "../common/urls";
import { env } from "./env";
import { getLogger } from "./utils/logger";

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
  initialize(port: number, basePath: string) {
    assert(!io, "Socket.IO server already initialized");

    const isHttps = env.SSL_CERTIFICATE && env.SSL_PRIVATE_KEY;

    const app = express();
    const server = isHttps
      ? https.createServer(
          {
            cert: env.SSL_CERTIFICATE,
            key: env.SSL_PRIVATE_KEY,
          },
          app,
        )
      : http.createServer(app);

    io = new SocketIoServer(server, {
      path: joinUrl("/", basePath, "socket.io/"),
      serveClient: false,
      perMessageDeflate: true,
    });

    // TODO: Limit requests per second and disconnect players that exceed it

    app.use(compression());
    app.use(joinUrl("/", basePath, "/"), express.static("build"));

    server.listen(port, () => {
      getLogger().info(
        `Server running at ${isHttps ? "https" : "http"}://localhost:${port}${joinUrl("/", basePath, "/")}`,
      );
    });
  },

  get io() {
    assert(io, "Socket.IO server not initialized");
    return io;
  },

  async addToRoom(socket: Socket, room: Room) {
    assert(io, "Socket.IO server not initialized");
    await socket.join(`room:${room.id}`);
  },
  broadcastRoom(room: Room) {
    assert(io, "Socket.IO server not initialized");
    return io.to(`room:${room.id}`);
  },
};
