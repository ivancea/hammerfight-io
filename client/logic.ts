import { type Socket } from "socket.io-client";
import { Player } from "../common/types/player";
import { Room } from "../common/types/room";
import { magnitude, subtract, Vector, withMagnitude } from "../common/vector";
import {
  destroyContext,
  getContext,
  getCurrentPlayer,
  isContextSet,
  isPlayerAlive,
  setContext,
} from "./context";
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

  const interval = setInterval(() => {
    if (!isContextSet() || context !== getContext()) {
      clearInterval(interval);
      return;
    }

    if (lastMousePosition) {
      updateAcceleration(lastMousePosition);
    }
  }, 10);
}

export function stopGame() {
  destroyGraphics();
  destroyContext();
}

export function playerJoined(player: Player) {
  getContext().room.players[player.id] = player;

  updatePlayer(player);
}

export function playerLeft(player: Player) {
  delete getContext().room.players[player.id];

  removePlayer(player);
}

export function playerDied(player: Player) {
  playerLeft(player);
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
  if (!isPlayerAlive()) {
    return;
  }

  const screenSize = getScreenSize();
  const playerPosition = getScreenPlayerPosition();

  const delta = subtract(mousePosition, playerPosition);

  const baseSize = Math.min(screenSize.x, screenSize.y) * 0.2;

  // [-1, 1] range
  const xAcc = Math.max(-1, Math.min(1, delta.x / baseSize));
  const yAcc = Math.max(-1, Math.min(1, delta.y / baseSize));

  const maxPlayerAcceleration = getContext().room.maxPlayerAcceleration;

  const acceleration = withMagnitude(
    {
      x: xAcc,
      y: yAcc,
    },
    maxPlayerAcceleration,
  );

  const lastAcceleration = getCurrentPlayer().acceleration;

  // Only send acceleration if it changed by more than 1% of the max acceleration
  if (
    magnitude(subtract(acceleration, lastAcceleration)) >
    getContext().room.maxPlayerAcceleration / 100
  ) {
    getContext().socket.emit("updateAcceleration", { acceleration });
  }
}
