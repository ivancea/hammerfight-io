import { Damage } from "../../common/damage";
import { assert } from "../../common/errors";
import { applyPhysics } from "../../common/physics";
import { makePlayer, Player } from "../../common/types/player";
import { Room } from "../../common/types/room";
import { makeFlailWeapon } from "../../common/types/weapon";
import { divide } from "../../common/vector";
import { getLogger } from "../logger";
import { server, Socket } from "../server";
import { getRoom, playersById, socketsById, world } from "../world";
import { updateBots } from "./logic.ai";

export type RoomController = {
  room: Room;

  joinPlayer(socket: Socket, username: string): Promise<Player>;
  disconnectPlayer(player: Player): void;
  updateRoom(elapsedTime: number): void;
  destroy(): void;
};

export function makeBaseRoomController(room: Room): RoomController {
  async function joinPlayer(socket: Socket, username: string) {
    await server.addToRoom(socket, room);

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

    return player;
  }

  function disconnectPlayer(player: Player) {
    const room = getRoom(player);

    socketsById[player.id]?.disconnect();

    delete room.players[player.id];
    delete playersById[player.id];
    delete socketsById[player.id];

    server.broadcastRoom(room).emit("playerLeft", { player });
  }

  function updateRoom(elapsedTime: number) {
    const damages: Damage[] = [];

    const updateBotsSpan = getLogger().measureSpan("updateBots");
    updateBots(room);
    updateBotsSpan.end();

    const applyPhysicsSpan = getLogger().measureSpan("applyPhysics");
    applyPhysics(room, elapsedTime, (damage) => damages.push(damage));
    applyPhysicsSpan.end();

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

    if (!Object.values(room.players).some((p) => !p.isBot)) {
      delete world.rooms[room.id];
      getLogger().info(`Deleted empty room ${room.id}`);
    }

    server.broadcastRoom(room).emit("roomUpdated", { room });
  }

  return {
    room,
    joinPlayer,
    disconnectPlayer,
    updateRoom,
    destroy() {},
  };
}
