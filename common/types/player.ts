import { Vector } from "../vector";
import { Weapon } from "./weapon";

export const AI_CONTEXT_SYMBOL = Symbol("AI_CONTEXT");
export type AiContext = {
  lastNameUpdate: number;
};

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

  isBot: boolean;

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

  [AI_CONTEXT_SYMBOL]?: AiContext;
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
    isBot: false,
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

export function makeBot(
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
    isBot: true,
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
