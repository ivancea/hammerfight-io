import { assert } from "../common/errors";
import { makePlayer, Player } from "../common/types/player";
import { makeRoom, Room } from "../common/types/room";
import { makeFlailWeapon } from "../common/types/weapon";
import { divide } from "../common/vector";
import { updateRoom } from "./logic";
import { server, Socket } from "./socket-io";

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

export function joinPlayer(socket: Socket, username: string) {
  // TODO: Validate username

  const room = findOrCreateRoomWithSpace();

  server.addToRoom(socket, room);

  const playerPosition = divide(room.size, 2); // TODO: Find an empty position
  const player = makePlayer(
    socket.id,
    room.id,
    username,
    playerPosition,
    makeFlailWeapon(playerPosition),
  );

  socketsById[socket.id] = socket;
  playersById[socket.id] = player;
  room.players[socket.id] = player;

  return { room, player };
}

export function disconnectPlayer(player: Player) {
  const room = getRoom(player);

  delete room.players[player.id];
  delete playersById[player.id];
  delete socketsById[player.id];

  if (Object.values(room.players).length === 0) {
    delete world.rooms[room.id];
  }
}

/**
 * Finds a room with space for a new player, or creates a new room if there's none.
 */
function findOrCreateRoomWithSpace(): Room {
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
  }, 10);

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
