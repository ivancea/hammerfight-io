import { assert } from "../../common/errors";
import { Player } from "../../common/types/player";
import { Room } from "../../common/types/room";
import { getLogger } from "../logger";
import { Socket } from "../server";
import { getRoom, world } from "../world";
import { RoomController } from "./room-controller.base";
import { BotsRoom } from "./room-controller.bots";
import { NormalRoom } from "./room-controller.normal";

const roomControllers: Record<number, RoomController> = {};

export async function joinPlayer(
  socket: Socket,
  username: string,
  roomWithBots: boolean,
) {
  // TODO: Validate username

  const room = findOrCreateRoomWithSpace(roomWithBots);
  const roomController = roomControllers[room.id];
  assert(roomController, "Room controller not found");

  const player = await roomController.joinPlayer(socket, username);

  return {
    room,
    player,
  };
}

export function disconnectPlayer(player: Player) {
  const room = getRoom(player);
  const roomController = roomControllers[room.id];
  assert(roomController, "Room controller not found");

  roomController.disconnectPlayer(player);
}

/**
 * Finds a room with space for a new player, or creates a new room if there's none.
 */
export function findOrCreateRoomWithSpace(roomWithBots: boolean): Room {
  for (const room of Object.values(world.rooms)) {
    if (
      roomWithBots !==
      Object.values(room.players).some((player) => player.isBot)
    ) {
      continue;
    }

    if (Object.keys(room.players).length < room.maxPlayers) {
      return room;
    }
  }

  const newRoom: Room = createRoom(roomWithBots);

  world.rooms[newRoom.id] = newRoom;

  assert(
    Object.keys(newRoom.players).length < newRoom.maxPlayers,
    "Room was created full",
  );

  return newRoom;
}

/**
 * Creates a new room. Starts the room physics loop.
 */
function createRoom(roomWithBots: boolean): Room {
  const controller = roomWithBots ? new BotsRoom() : new NormalRoom();
  const room = controller.room;

  world.rooms[room.id] = room;
  roomControllers[room.id] = controller;

  let lastUpdateTime = Date.now() / 1000;
  const roomMillisecondsBetweenIntervalsStats = getLogger().stats(
    "room milliseconds between intervals",
    500,
  );
  const roomUpdateMillisecondsDelayStats = getLogger().stats(
    "room update milliseconds delay",
    500,
  );

  const intervalId = setInterval(() => {
    if (!world.rooms[room.id]) {
      clearInterval(intervalId);
    } else {
      const now = Date.now();
      const newUpdateTime = now / 1000;
      const elapsedTime = newUpdateTime - lastUpdateTime;

      roomMillisecondsBetweenIntervalsStats.add(elapsedTime * 1000);

      controller.updateRoom(elapsedTime);

      roomUpdateMillisecondsDelayStats.add(Date.now() - now);
      lastUpdateTime = newUpdateTime;
    }
  }, 15);

  return room;
}
