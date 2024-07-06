import { type Socket } from "socket.io-client";
import { assert } from "../common/errors";
import { Player } from "../common/types/player";
import { Room } from "../common/types/room";
import { subtract, Vector } from "../common/vector";
import { Context } from "./context";
import {
  destroyGraphics,
  getScreenPlayerPosition,
  getScreenSize,
  initializeGraphics,
  removePlayer,
  updatePlayer,
  updateRoom,
} from "./graphics";

let context: Context | undefined;
let lastMousePosition: Vector | undefined;

export function initializeGame(socket: Socket, room: Room, player: Player) {
  assert(!context, "Context should not be defined");

  context = {
    socket,
    room,
    playerId: player.id,
  };

  initializeGraphics(context, {
    onMouseMove(mousePosition) {
      updateAcceleration(mousePosition);

      lastMousePosition = mousePosition;
    },
  });

  const currentContext = context;

  const interval = setInterval(() => {
    if (context !== currentContext) {
      clearInterval(interval);
      return;
    }

    if (lastMousePosition) {
      updateAcceleration(lastMousePosition);
    }
  });
}

export function stopGame() {
  destroyGraphics();

  context = undefined;
}

export function playerJoined(player: Player) {
  assert(context, "Context should be defined");
  console.log(`Player ${player.id} joined the room`);

  context.room.players[player.id] = player;

  updatePlayer(context, player);
}

export function playerLeft(player: Player) {
  assert(context, "Context should be defined");
  console.log(`Player ${player.id} left the room`);

  delete context.room.players[player.id];

  removePlayer(context, player);
}

export function playerUpdated(player: Player) {
  assert(context, "Context should be defined");

  updatePlayer(context, player);
}

export function roomUpdated(room: Room) {
  assert(context, "Context should be defined");

  const oldRoom = context.room;
  context.room = room;

  updateRoom(context, oldRoom);
}

export function updateAcceleration(mousePosition: Vector) {
  assert(context, "Context should be defined");

  const screenSize = getScreenSize();
  const playerPosition = getScreenPlayerPosition(context);

  const delta = subtract(mousePosition, playerPosition);

  const baseSize = Math.min(screenSize.x, screenSize.y) * 0.4;

  // [-1, 1] range
  const xAcc = Math.max(-1, Math.min(1, delta.x / baseSize));
  const yAcc = Math.max(-1, Math.min(1, delta.y / baseSize));

  console.log("Delta: " + delta, xAcc, yAcc);

  const acceleration = {
    x: xAcc * context.room.maxPlayerAcceleration,
    y: yAcc * context.room.maxPlayerAcceleration,
  };

  console.log("Sending acceleration", acceleration);

  context.socket.emit("updateAcceleration", { acceleration });
}
