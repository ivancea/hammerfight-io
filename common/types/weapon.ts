import { Vector } from "../vector";

export type Weapon = FlailWeapon | AuraWeapon | SwordWeapon;

export type WeaponType = Weapon["type"];
export const WEAPON_TYPES = ["flail", "aura", "sword"] as const;

type BaseWeapon = {
  // Using WEAPON_TYPES here as a double check that all weapon types are covered
  type: (typeof WEAPON_TYPES)[number];
};

/**
 * A flail weapon: A hanging ball attached to a chain.
 */
export type FlailWeapon = BaseWeapon & {
  type: "flail";
  weight: number;
  radius: number;
  chainLength: number;
  position: Vector;
  velocity: Vector;
  maxSpeed: number;
};

export function makeFlailWeapon(position: Vector): FlailWeapon {
  return {
    type: "flail",
    weight: 100,
    radius: 10,
    chainLength: 80,
    position,
    velocity: { x: 0, y: 0 },
    maxSpeed: 1000,
  };
}

/**
 * An aura around the player that damages enemies and protects from player-player collisions.
 */
export type AuraWeapon = BaseWeapon & {
  type: "aura";
  /**
   * A multiplier on the player weight applied to player-player collisions.
   */
  playerCollisionWeightMultiplier: number;
  /**
   * The radius the aura extends from the player.
   */
  radiusFromPlayer: number;
  /**
   * A multiplier on the damage dealt by the aura to other players.
   */
  damageMultiplier: number;
};

export function makeAuraWeapon(): AuraWeapon {
  return {
    type: "aura",
    playerCollisionWeightMultiplier: 2,
    radiusFromPlayer: 5,
    damageMultiplier: 1.5,
  };
}

/**
 * A sword weapon: A rigid blade extending from the player that swings based on movement.
 */
export type SwordWeapon = BaseWeapon & {
  type: "sword";
  weight: number;
  /**
   * The length of the blade from the player center.
   *
   * In meters.
   */
  length: number;
  /**
   * The width of the blade.
   *
   * In meters.
   */
  width: number;
  /**
   * The current angle of the sword.
   *
   * In radians. 0 is right, PI/2 is down, PI is left, -PI/2 is up.
   */
  angle: number;
  /**
   * The angular velocity of the sword.
   *
   * In radians per second.
   */
  angularVelocity: number;
  /**
   * The maximum angular speed of the sword.
   *
   * In radians per second.
   */
  maxAngularSpeed: number;
};

export function makeSwordWeapon(): SwordWeapon {
  return {
    type: "sword",
    weight: 80,
    length: 75,
    width: 8,
    angle: Math.PI / 2,
    angularVelocity: 0,
    maxAngularSpeed: 10,
  };
}
