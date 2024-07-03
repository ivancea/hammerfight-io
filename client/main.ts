import { io, type Socket } from "socket.io-client";
import { SocketIoServerListenEvents } from "../types/socket-io-events";

function main() {
  const socket: Socket<
    Record<string, never>,
    SocketIoServerListenEvents
  > = io();

  socket.emit("join", { username: "My username" });
}

main();
