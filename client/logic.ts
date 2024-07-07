import { type Socket } from "socket.io-client";
import { Player } from "../common/types/player";
import { Room } from "../common/types/room";
import { subtract, Vector } from "../common/vector";
import { destroyContext, getContext, setContext } from "./context";
import {
  destroyGraphics,
  getScreenPlayerPosition,
  getScreenSize,
  initializeGraphics,
  removePlayer,
  updatePlayer,
  updateRoom,
} from "./graphics";

let lastMousePosition: Vector | undefined;

export function initializeGame(
  socket: Socket,
  room: Room,
  player: Player,
  debugMode: boolean,
) {
  const context = {
    socket,
    room,
    playerId: player.id,
    debugMode,
  };

  setContext(context);

  initializeGraphics({
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
  destroyContext();
}

export function playerJoined(player: Player) {
  console.log(`Player ${player.id} joined the room`);

  getContext().room.players[player.id] = player;

  updatePlayer(player);
}

export function playerLeft(player: Player) {
  console.log(`Player ${player.id} left the room`);

  delete getContext().room.players[player.id];

  removePlayer(player);
}

export function playerUpdated(player: Player) {
  updatePlayer(player);
}

export function roomUpdated(room: Room) {
  const oldRoom = getContext().room;
  getContext().room = room;

  updateRoom(oldRoom);
}

export function updateAcceleration(mousePosition: Vector) {
  const screenSize = getScreenSize();
  const playerPosition = getScreenPlayerPosition();

  const delta = subtract(mousePosition, playerPosition);

  const baseSize = Math.min(screenSize.x, screenSize.y) * 0.4;

  // [-1, 1] range
  const xAcc = Math.max(-1, Math.min(1, delta.x / baseSize));
  const yAcc = Math.max(-1, Math.min(1, delta.y / baseSize));

  console.log("Delta: " + delta, xAcc, yAcc);

  const maxPlayerAcceleration = getContext().room.maxPlayerAcceleration;

  const acceleration = {
    x: xAcc * maxPlayerAcceleration,
    y: yAcc * maxPlayerAcceleration,
  };

  console.log("Sending acceleration", acceleration);

  getContext().socket.emit("updateAcceleration", { acceleration });
}
