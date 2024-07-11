import { assert } from "../common/errors";
import { Player } from "../common/types/player";
import { makeRoom, Room } from "../common/types/room";
import { updateRoom } from "./logic";
import { Socket } from "./server";

export type World = {
  /**
   * The current running rooms in the world.
   */
  rooms: Record<number, Room>;
};

export const world: World = {
  rooms: {},
};

/**
 * Player sockets by their socket ID.
 */
export const socketsById: Record<string, Socket> = {};

/**
 * Players by their socket ID.
 */
export const playersById: Record<string, Player> = {};

let nextRoomId = 1;

/**
 * Finds a room with space for a new player, or creates a new room if there's none.
 */
export function findOrCreateRoomWithSpace(): Room {
  for (const room of Object.values(world.rooms)) {
    if (Object.keys(room.players).length < room.maxPlayers) {
      return room;
    }
  }

  const newRoom: Room = createRoom();

  world.rooms[newRoom.id] = newRoom;

  return newRoom;
}

/**
 * Creates a new room. Starts the room physics loop.
 */
function createRoom(): Room {
  const room = makeRoom(nextRoomId++);

  world.rooms[room.id] = room;

  let lastUpdateTime = Date.now() / 1000;

  const intervalId = setInterval(() => {
    if (!world.rooms[room.id]) {
      clearInterval(intervalId);
    } else {
      const newUpdateTime = Date.now() / 1000;
      updateRoom(room, newUpdateTime - lastUpdateTime);
      lastUpdateTime = newUpdateTime;
    }
  }, 15);

  return room;
}

export function getPlayer(socket: Socket) {
  return playersById[socket.id];
}

export function getRoom(player: Player) {
  const room = world.rooms[player.roomId];
  assert(room, `Room ${player.roomId} of player ${player.id} not found`);

  return room;
}
