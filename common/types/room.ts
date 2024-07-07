import { Vector } from "../vector";
import { makePlayer, Player } from "./player";
import { makeFlailWeapon } from "./weapon";

/**
 * Container of all the data and players inside a game room.
 */
export type Room = {
  /**
   * Unique identifier of the room.
   */
  id: number;

  /**
   * Maximum number of players allowed in the room.
   */
  maxPlayers: number;

  /**
   * Players inside the room.
   *
   * The key is the Socket ID of the player.
   */
  players: Record<string, Player>;

  /**
   * The size of the room.
   *
   * - X is the width (0: left, size.x: right)
   * - Y is the height (0: bottom, size.y: top)
   *
   * In meters.
   */
  size: Vector;

  /**
   * Gravity acceleration applied in all the objects inside the room.
   *
   * In meters per second squared.
   */
  gravity: Vector;

  /**
   * Maximum speed a player can reach.
   *
   * Used as a sanity check. Friction should take care of limiting speed.
   *
   * In meters per second.
   */
  maxPlayerSpeed: number;

  /**
   * Maximum acceleration a player can reach.
   *
   * Used to control input and avoid cheating.
   *
   * In meters per second squared.
   */
  maxPlayerAcceleration: number;
};

export function makeRoom(roomId: number): Room {
  return {
    id: roomId,
    maxPlayers: 5,
    players: {
      _BOT_1: makePlayer(
        "_BOT_1",
        roomId,
        "BOT 1",
        { x: 1000 - 200, y: 1000 },
        makeFlailWeapon({ x: 1000 - 200, y: 1000 }),
      ),
      _BOT_2: makePlayer(
        "_BOT_2",
        roomId,
        "BOT 2",
        { x: 1000 + 200, y: 1000 },
        makeFlailWeapon({ x: 1000 + 200, y: 1000 }),
      ),
    },
    size: { x: 2_000, y: 2_000 },
    gravity: { x: 0, y: 200 },
    maxPlayerSpeed: 500,
    maxPlayerAcceleration: 400,
  };
}
