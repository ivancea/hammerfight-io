import { assert } from "../common/errors";
import { Player } from "../common/types/player";
import { Room } from "../common/types/room";
import { updateRoom } from "./logic";
import { server, Socket } from "./socket-io";

const ROOM_SIZE = { x: 100, y: 100 };
const ROOM_GRAVITY = { x: 0, y: -10 };

const MAX_PLAYERS_PER_ROOM = 3;
const MAX_PLAYER_HEALTH = 100;
const PLAYER_RADIUS = 10;
const PLAYER_WEIGHT = 50;

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

  const player: Player = {
    id: socket.id,
    roomId: room.id,
    joinTimestamp: Date.now(),
    username,
    health: MAX_PLAYER_HEALTH,
    radius: PLAYER_RADIUS,
    weight: PLAYER_WEIGHT,
    position: { x: 0, y: 0 }, // TODO: Find an empty position
    velocity: { x: 0, y: 0 },

    weapon: undefined,
  };

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
    if (Object.keys(room.players).length < MAX_PLAYERS_PER_ROOM) {
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
  const newRoom: Room = {
    id: nextRoomId++,
    players: {},
    size: ROOM_SIZE,
    gravity: ROOM_GRAVITY,
  };

  world.rooms[newRoom.id] = newRoom;

  const intervalId = setInterval(() => {
    if (!world.rooms[newRoom.id]) {
      clearInterval(intervalId);
    } else {
      updateRoom(newRoom);
    }
  }, 10);

  return newRoom;
}

export function getPlayer(socket: Socket) {
  return playersById[socket.id];
}

export function getRoom(player: Player) {
  const room = world.rooms[player.roomId];
  assert(room, `Room ${player.roomId} of player ${player.id} not found`);

  return room;
}
