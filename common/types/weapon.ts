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
 * A sword weapon: A rigid line extending from the player.
 */
export type SwordWeapon = BaseWeapon & {
  type: "sword";
  weight: number;
  width: number; // Width of the sword (used for collision)
  length: number; // Length of the sword from hilt to tip
  position: Vector; // Position of the sword base (at player)
  tipPosition?: Vector; // Position of the sword tip (for collision detection)
  rotation: number; // Rotation of the sword in radians
  angularSpeed: number; // Speed of rotation in radians per second
  maxSpeed: number;
  damageMultiplier: number;
};

export function makeSwordWeapon(position: Vector): SwordWeapon {
  const rotation = Math.PI / 2; // Start pointing upward
  return {
    type: "sword",
    weight: 150,
    width: 8, // Width of the sword blade (for collision)
    length: 60, // Length of the sword
    position,
    tipPosition: {
      x: position.x + Math.cos(rotation) * 60,
      y: position.y + Math.sin(rotation) * 60,
    },
    rotation,
    angularSpeed: 0, // Initial angular speed
    maxSpeed: 1000,
    damageMultiplier: 1.5,
  };
}
