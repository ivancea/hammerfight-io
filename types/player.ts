import { Vector } from "./vector";

/**
 * Represents a player data in a room.
 */
export type Player = {
  /**
   * The ID of the player socket.
   */
  id: string;

  /**
   * The ID of the room the player is in.
   */
  roomId: number;

  joinTimestamp: number;

  username: string;

  health: number;

  position: Vector;
  velocity: Vector;

  /**
   * The weapon type and position. To be done.
   */
  weapon: undefined;
};
