import { Damage } from "../../common/damage";
import { assert } from "../../common/errors";
import { applyPhysics } from "../../common/physics";
import { makePlayer, Player } from "../../common/types/player";
import { Room } from "../../common/types/room";
import { makeFlailWeapon } from "../../common/types/weapon";
import { divide } from "../../common/vector";
import { server, Socket } from "../server";
import { getLogger } from "../utils/logger";
import { getRoom, playersById, socketsById, world } from "../world";
import { updateBots } from "./logic.ai";

export type RoomController = {
  room: Room;

  joinPlayer(socket: Socket, username: string): Promise<Player>;
  disconnectPlayer(player: Player): void;
  updateRoom(elapsedTime: number): void;
  destroy(): void;
};

export class BaseRoomController implements RoomController {
  static makeRoom(roomId: number): Room {
    return {
      id: roomId,
      maxPlayers: 5,
      players: {},
      size: { x: 2000, y: 2000 },
      gravity: { x: 0, y: 200 },
      maxPlayerSpeed: 500,
      maxPlayerAcceleration: 400,
    };
  }

  constructor(public room: Room) {}

  async joinPlayer(socket: Socket, username: string) {
    await server.addToRoom(socket, this.room);

    const playerPosition = divide(this.room.size, 2); // TODO: Find an empty position
    const player = makePlayer(
      socket.id,
      this.room.id,
      username,
      playerPosition,
      makeFlailWeapon(playerPosition),
    );

    socketsById[socket.id] = socket;
    playersById[socket.id] = player;
    this.room.players[socket.id] = player;

    return player;
  }

  disconnectPlayer(player: Player) {
    const room = getRoom(player);

    socketsById[player.id]?.disconnect();

    delete room.players[player.id];
    delete playersById[player.id];
    delete socketsById[player.id];

    server.broadcastRoom(room).emit("playerLeft", { player });
  }

  updateRoom(elapsedTime: number) {
    const damages: Damage[] = [];

    getLogger().statsFunction(
      {
        name: "update bots",
        unit: "milliseconds",
        extra: `room:${this.room.id}`,
      },
      () => {
        updateBots(this.room);
      },
    );

    getLogger().statsFunction(
      {
        name: "apply physics",
        unit: "milliseconds",
        extra: `room:${this.room.id}`,
      },
      () => {
        applyPhysics(this.room, elapsedTime, (damage) => damages.push(damage));
      },
    );

    const deadPlayerIds = new Set<string>();

    // Apply damages
    for (const damage of damages) {
      const damagedPlayer = this.room.players[damage.damagedPlayerId];
      assert(damagedPlayer, "Damaged player not found");

      // TODO: Ignore damage if damaged by same source in the last N milliseconds

      damagedPlayer.health -= damage.amount;

      if (damagedPlayer.health <= 0) {
        deadPlayerIds.add(damagedPlayer.id);
      }
    }

    // Remove dead players
    for (const deadPlayerId of deadPlayerIds) {
      const deadPlayer = this.room.players[deadPlayerId];
      assert(deadPlayer, "Damaged player not found");

      server
        .broadcastRoom(this.room)
        .emit("playerDied", { player: deadPlayer });

      this.disconnectPlayer(deadPlayer);
    }

    if (!Object.values(this.room.players).some((p) => !p.isBot)) {
      delete world.rooms[this.room.id];
      getLogger().info(`Deleted empty room ${this.room.id}`);
    }

    server.broadcastRoom(this.room).emit("roomUpdated", { room: this.room });
  }

  destroy() {}
}
