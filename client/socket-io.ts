import { io, type Socket } from "socket.io-client";
import { assert } from "../common/errors";
import type {
  SocketIoClientSentEvents,
  SocketIoServerSentEvents,
} from "../common/types/socket-io";
import { Context } from "./context";
import {
  initializeGame,
  removePlayer,
  stopGame,
  updatePlayer,
  updateRoom,
} from "./graphics";

let socket:
  | Socket<SocketIoServerSentEvents, SocketIoClientSentEvents>
  | undefined;
let context: Context | undefined;

export function joinRoom(username: string) {
  if (socket) {
    socket.disconnect();
    socket = undefined;
    context = undefined;
  }

  socket = io();

  socket.on("playerJoined", ({ player }) => {
    assert(context, "Context should be defined");
    console.log(`Player ${player.id} joined the room`);

    context.room.players[player.id] = player;

    updatePlayer(context, player);
  });

  socket.on("playerLeft", ({ player }) => {
    assert(context, "Context should be defined");
    console.log(`Player ${player.id} left the room`);

    delete context.room.players[player.id];

    removePlayer(context, player);
  });

  socket.on("playerUpdated", ({ player }) => {
    assert(context, "Context should be defined");

    updatePlayer(context, player);
  });

  socket.on("roomUpdated", ({ room }) => {
    assert(context, "Context should be defined");

    const oldRoom = context.room;
    context.room = room;

    updateRoom(context, oldRoom);
  });

  socket.on("disconnect", (reason) => {
    console.log("Disconnected from server:", reason);

    stopGame();
  });

  socket.emit("requestJoin", { username }, (room, player) => {
    assert(socket, "Socket should be defined");
    console.log(`Joined room ${room.id} as player ${player.id}`, room);

    context = {
      socket,
      room,
      playerId: player.id,
    };

    initializeGame(context, {
      onMouseMove(windowSize, position) {
        assert(socket, "Socket should be defined");

        const baseSize = Math.min(windowSize.x, windowSize.y) * 0.6;

        // [-1, 1] range
        const xAcc = Math.max(
          -1,
          Math.min(1, (position.x * 2 - windowSize.x) / baseSize),
        );
        const yAcc = Math.max(
          -1,
          Math.min(1, (position.y * 2 - windowSize.y) / baseSize),
        );

        const acceleration = {
          x: xAcc * room.maxPlayerAcceleration,
          y: yAcc * room.maxPlayerAcceleration,
        };

        console.log("Sending acceleration", acceleration);

        socket.emit("updateAcceleration", { acceleration });
      },
    });
  });
}

export function getSocket() {
  return socket;
}
