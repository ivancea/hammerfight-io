import { assert } from "../../common/errors";
import { Player } from "../../common/types/player";
import { Room } from "../../common/types/room";
import { WeaponType } from "../../common/types/weapon";
import { Socket } from "../server";
import { getLogger } from "../utils/logger";
import { StopWatch } from "../utils/stopwatch";
import { getRoom, world } from "../world";
import { RoomController } from "./room-controller.base";
import { BotsRoom } from "./room-controller.bots";
import { NormalRoom } from "./room-controller.normal";

const roomControllers: Record<number, RoomController> = {};

export async function joinPlayer(
  socket: Socket,
  username: string,
  roomWithBots: boolean,
  weapon: WeaponType,
) {
  // TODO: Validate username

  const room = findOrCreateRoomWithSpace(roomWithBots);
  const roomController = roomControllers[room.id];
  assert(roomController, "Room controller not found");

  const player = await roomController.joinPlayer(socket, username, weapon);

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

  const elapsedTimeStopWatch = new StopWatch();

  const intervalId = setInterval(() => {
    if (!world.rooms[room.id]) {
      clearInterval(intervalId);
    } else {
      const roomUpdateStopWatch = new StopWatch();
      const elapsedTime = elapsedTimeStopWatch.next();

      controller.updateRoom(elapsedTime / 1000);

      getLogger().stats({
        name: "room interval delay",
        unit: "milliseconds",
        extra: {
          room_id: `${room.id}`,
        },
        value: elapsedTime,
      });
      getLogger().stats({
        name: "room update delay",
        unit: "milliseconds",
        extra: {
          room_id: `${room.id}`,
        },
        value: roomUpdateStopWatch.next(),
      });
    }
  }, 15);

  return room;
}
