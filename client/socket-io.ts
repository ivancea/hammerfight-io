import { io, type Socket } from "socket.io-client";
import { assert } from "../common/errors";
import type {
  SocketIoClientSentEvents,
  SocketIoServerSentEvents,
} from "../common/types/socket-io";
import { joinUrl } from "../common/urls";
import { env } from "./env";
import { InputHandlerId } from "./input/input-handler-catalog";
import {
  initializeGame,
  playerDied,
  playerJoined,
  playerLeft,
  playerUpdated,
  roomUpdated,
  stopGame,
} from "./logic";

let socket:
  | Socket<SocketIoServerSentEvents, SocketIoClientSentEvents>
  | undefined;

export function joinRoom(
  username: string,
  inputHandlerId: InputHandlerId,
  roomWithBots: boolean,
  debugMode: boolean,
) {
  if (socket) {
    socket.disconnect();
    socket = undefined;
    stopGame();
  }

  socket = io({
    path: joinUrl("/", env.BASE_PATH, "socket.io/"),
  });

  socket.on("playerJoined", ({ player }) => {
    console.log(`Player ${player.id} joined the room`);

    playerJoined(player);
  });

  socket.on("playerLeft", ({ player }) => {
    console.log(`Player ${player.id} left the room`);

    playerLeft(player);
  });

  socket.on("playerDied", ({ player }) => {
    console.log(`Player ${player.id} died`);

    playerDied(player);
  });

  socket.on("playerUpdated", ({ player }) => {
    playerUpdated(player);
  });

  socket.on("roomUpdated", ({ room }) => {
    roomUpdated(room);
  });

  socket.on("disconnect", (reason) => {
    console.log("Disconnected from server:", reason);

    stopGame();
  });

  socket.emit("requestJoin", { username, roomWithBots }, (room, player) => {
    assert(socket, "Socket should be defined");
    console.log(`Joined room ${room.id} as player ${player.id}`, room);

    initializeGame(socket, room, player, inputHandlerId, debugMode);
  });
}
