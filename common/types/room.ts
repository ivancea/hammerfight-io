import { Player } from "./player";
import { Vector } from "./vector";

/**
 * Container of all the data and players inside a game room.
 */
export type Room = {
  /**
   * Unique identifier of the room.
   */
  id: number;

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
};
