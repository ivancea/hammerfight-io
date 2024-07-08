import { Damage } from "../common/damage";
import { assert } from "../common/errors";
import { applyPhysics } from "../common/physics";
import { makePlayer, Player } from "../common/types/player";
import { Room } from "../common/types/room";
import { makeFlailWeapon } from "../common/types/weapon";
import { divide } from "../common/vector";
import { server, Socket } from "./socket-io";
import {
  findOrCreateRoomWithSpace,
  getRoom,
  playersById,
  socketsById,
  world,
} from "./world";

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

  socketsById[player.id]?.disconnect();

  delete room.players[player.id];
  delete playersById[player.id];
  delete socketsById[player.id];

  if (Object.values(room.players).length === 0) {
    delete world.rooms[room.id];
  }

  server.broadcastRoom(room).emit("playerLeft", { player });
}

export function updateRoom(room: Room, elapsedTime: number) {
  const damages: Damage[] = [];

  applyPhysics(room, elapsedTime, (damage) => damages.push(damage));

  const deadPlayerIds = new Set<string>();

  // Apply damages
  for (const damage of damages) {
    const damagedPlayer = room.players[damage.damagedPlayerId];
    assert(damagedPlayer, "Damaged player not found");

    // TODO: Ignore damage if damaged by same source in the last N milliseconds

    damagedPlayer.health -= damage.amount;

    if (damagedPlayer.health <= 0) {
      deadPlayerIds.add(damagedPlayer.id);
    }
  }

  // Remove dead players
  for (const deadPlayerId of deadPlayerIds) {
    const deadPlayer = room.players[deadPlayerId];
    assert(deadPlayer, "Damaged player not found");

    server.broadcastRoom(room).emit("playerDied", { player: deadPlayer });

    disconnectPlayer(deadPlayer);
  }

  server.broadcastRoom(room).emit("roomUpdated", { room });
}
