import { Vector } from "../vector";

export type Weapon = FlailWeapon;

type BaseWeapon = {
  type: string;
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
    weight: 10,
    radius: 4,
    chainLength: 30,
    position,
    velocity: { x: 0, y: 0 },
    maxSpeed: 1000,
  };
}
