import { io, type Socket } from "socket.io-client";
import { SocketIoServerListenEvents } from "../types/socket-io-events";

let socket: Socket<Record<string, never>, SocketIoServerListenEvents>;

function joinRoom(username: string) {
  socket = io();

  socket.emit("join", { username }, (room) => {
    console.log("Joined room", room);
  });
}

function main() {
  document
    .getElementById("room-selection-form-submit")
    ?.addEventListener("click", (event) => {
      event.preventDefault();

      const username = (document.getElementById("username") as HTMLInputElement)
        .value;
      joinRoom(username);
    });
}

main();
