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

  /**
   * The radius of the player.
   *
   * In meters.
   */
  radius: number;

  /**
   * The weight of the player.
   *
   * In kilograms.
   */
  weight: number;

  /**
   * The position of the player.
   *
   * In meters.
   */
  position: Vector;

  /**
   * The position of the player.
   *
   * In meters per second.
   */
  velocity: Vector;

  /**
   * The weapon type and position. To be done.
   */
  weapon: undefined;
};
