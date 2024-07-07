import { Vector } from "../vector";
import { Weapon } from "./weapon";

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

  maxHealth: number;
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
   * The acceleration of the player.
   * Based on the player input.
   *
   * In meters per second squared.
   */
  acceleration: Vector;

  /**
   * The weapon the player is holding, with all its data for simulation.
   */
  weapon: Weapon;
};

export function makePlayer(
  playerId: string,
  roomId: number,
  username: string,
  position: Vector,
  weapon: Weapon,
): Player {
  return {
    id: playerId,
    roomId,
    joinTimestamp: Date.now(),
    username,
    maxHealth: 1000,
    health: 1000,
    radius: 20,
    weight: 50,
    position,
    velocity: { x: 0, y: 0 },
    acceleration: { x: 0, y: 0 },
    weapon,
  };
}
