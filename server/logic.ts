import { Damage } from "../common/damage";
import { assert } from "../common/errors";
import { applyPhysics } from "../common/physics";
import { Room } from "../common/types/room";
import { server } from "./socket-io";

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

    delete room.players[deadPlayerId];
  }

  server.broadcastRoom(room).emit("roomUpdated", { room });
}
