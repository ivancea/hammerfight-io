import { Vector } from "../vector";

export type Weapon = FlailWeapon | AuraWeapon;

export type WeaponType = Weapon["type"];
export const WEAPON_TYPES = ["flail", "aura"] as const;

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
