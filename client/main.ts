import { io, type Socket } from "socket.io-client";
import type {
  SocketIoClientSentEvents,
  SocketIoServerSentEvents,
} from "../types/socket-io-events";

let socket: Socket<SocketIoServerSentEvents, SocketIoClientSentEvents>;

function joinRoom(username: string) {
  socket = io();

  socket.emit("requestJoin", { username }, (room) => {
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
