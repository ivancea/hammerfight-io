import { Socket } from "socket.io";
import { Player } from "../types/player";
import { Room } from "../types/room";

const MAX_PLAYERS_PER_ROOM = 3;
const MAX_PLAYER_HEALTH = 100;

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
export const players: Record<string, Socket> = {};

let nextRoomId = 1;

export function joinPlayer(socket: Socket, username: string) {
  const room = findOrCreateRoomWithSpace();

  const player: Player = {
    id: socket.id,
    roomId: room.id,
    joinTimestamp: Date.now(),
    username,
    health: MAX_PLAYER_HEALTH,
    position: { x: 0, y: 0 }, // TODO: Find an empty position
    velocity: { x: 0, y: 0 },

    weapon: undefined,
  };

  players[socket.id] = socket;
  room.players[socket.id] = player;

  return room;
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

  const newRoom = {
    id: nextRoomId++,
    players: {},
  };

  world.rooms[newRoom.id] = newRoom;

  return newRoom;
}
