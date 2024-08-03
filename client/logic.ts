import { type Socket } from "socket.io-client";
import { assert } from "../common/errors";
import { Player } from "../common/types/player";
import { Room } from "../common/types/room";
import { magnitude, subtract, Vector } from "../common/vector";
import {
  destroyContext,
  getContext,
  getCurrentPlayer,
  isCurrentPlayer,
  setContext,
} from "./context";
import {
  destroyGraphics,
  initializeGraphics,
  removePlayer,
  updatePlayer,
  updateRoom,
} from "./graphics";
import {
  InputHandlerId,
  makeInputHandler,
} from "./input/input-handler-catalog";
import { InputHandler } from "./input/input-handler.base";

let inputHandler: InputHandler | undefined;

export function initializeGame(
  socket: Socket,
  room: Room,
  player: Player,
  inputHandlerId: InputHandlerId,
  debugMode: boolean,
) {
  const context = {
    socket,
    room,
    playerId: player.id,
    debugMode,
  };

  setContext(context);

  const htmlElement = initializeGraphics();

  inputHandler = makeInputHandler(
    inputHandlerId,
    context,
    htmlElement,
    updateAcceleration,
  );
}

export function stopGame() {
  inputHandler?.terminate();
  destroyGraphics();
  destroyContext();
}

export function playerJoined(player: Player) {
  getContext().room.players[player.id] = player;

  updatePlayer(player);
}

export function playerLeft(player: Player) {
  if (isCurrentPlayer(player.id)) {
    inputHandler?.terminate();
  }

  if (getContext().room.players[player.id]) {
    removePlayer(player);
    delete getContext().room.players[player.id];
  }
}

export function playerDied(player: Player) {
  assert(getContext().room.players[player.id], "Player does not exist");
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

export function updateAcceleration(acceleration: Vector) {
  const lastAcceleration = getCurrentPlayer().acceleration;

  // Only send acceleration if it changed by more than 1%
  const lastAccelerationMagnitude = magnitude(lastAcceleration);
  const accelerationChangeMagnitude = magnitude(
    subtract(acceleration, lastAcceleration),
  );
  const percentualChange =
    accelerationChangeMagnitude / lastAccelerationMagnitude;
  if (
    (lastAccelerationMagnitude === 0 && magnitude(acceleration) !== 0) ||
    percentualChange > 0.01
  ) {
    getContext().socket.emit("updateAcceleration", { acceleration });
  }
}
