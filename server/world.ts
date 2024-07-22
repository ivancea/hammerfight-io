import { assert } from "../common/errors";
import { makeBot, Player } from "../common/types/player";
import { makeRoom, Room } from "../common/types/room";
import { makeFlailWeapon } from "../common/types/weapon";
import { getLogger } from "./logger";
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

  return newRoom;
}

/**
 * Creates a new room. Starts the room physics loop.
 */
function createRoom(roomWithBots: boolean): Room {
  const room = makeRoom(nextRoomId++);

  if (roomWithBots) {
    const botCount = 2;
    for (let i = 0; i < botCount; i++) {
      const botId = `_BOT_${i + 1}`;
      const botName = `BOT ${i + 1}`;
      const position = {
        x: (room.size.x / (botCount + 1)) * (i + 1),
        y: room.size.y / 2,
      };

      room.players[botId] = makeBot(
        botId,
        room.id,
        botName,
        position,
        makeFlailWeapon(position),
      );
    }
  }

  world.rooms[room.id] = room;

  let lastUpdateTime = Date.now() / 1000;
  const roomMillisecondsBetweenIntervalsStats = getLogger().stats(
    "room milliseconds between intervals",
    500,
  );
  const roomUpdateMillisecondsDelayStats = getLogger().stats(
    "room update milliseconds delay",
    500,
  );

  const intervalId = setInterval(() => {
    if (!world.rooms[room.id]) {
      clearInterval(intervalId);
    } else {
      const now = Date.now();
      const newUpdateTime = now / 1000;
      const elapsedTime = newUpdateTime - lastUpdateTime;

      roomMillisecondsBetweenIntervalsStats.add(elapsedTime * 1000);

      updateRoom(room, elapsedTime);

      roomUpdateMillisecondsDelayStats.add(Date.now() - now);
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
