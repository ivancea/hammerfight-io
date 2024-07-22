import { assert } from "../common/errors";
import { Player } from "../common/types/player";
import { Room } from "../common/types/room";
import { Socket } from "./server";

export type World = {
  /**
   * The next room ID to be used when creating a room.
   */
  nextRoomId: number;
  /**
   * The current running rooms in the world.
   */
  rooms: Record<number, Room>;
};

export const world: World = {
  nextRoomId: 1,
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

export function getPlayer(socket: Socket) {
  return playersById[socket.id];
}

export function getRoom(player: Player) {
  const room = world.rooms[player.roomId];
  assert(room, `Room ${player.roomId} of player ${player.id} not found`);

  return room;
}
