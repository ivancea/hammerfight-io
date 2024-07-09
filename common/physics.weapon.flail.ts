import { Damage } from "./damage";
import {
  applyFriction,
  handleCircleCollisionWithLimits,
  handleCirclesCollision,
  moveWithAcceleration,
} from "./physics.common";
import { ELASTICITY } from "./physics.constants";
import { Player } from "./types/player";
import { Room } from "./types/room";
import { FlailWeapon } from "./types/weapon";
import { add, clampMagnitude, magnitude, multiply, subtract } from "./vector";

export function moveFlailWeapon(
  weapon: FlailWeapon,
  player: Player,
  room: Room,
  elapsedTime: number,
) {
  moveWithAcceleration(weapon, room.gravity, weapon.maxSpeed, elapsedTime);

  // Chain length constraint
  const chainVector = subtract(player.position, weapon.position);
  const currentChainLength = magnitude(chainVector);

  if (currentChainLength > weapon.chainLength) {
    const positionDelta = clampMagnitude(
      chainVector,
      currentChainLength - weapon.chainLength,
    );

    weapon.position = add(weapon.position, positionDelta);
    weapon.velocity = add(
      weapon.velocity,
      // Bounce on chain length
      // The higher the elasticity coefficient, the fastest the weapon will swing
      multiply(positionDelta, ELASTICITY / elapsedTime),
    );
  }
}

export function handleFlailWeaponCollisions(
  weapon: FlailWeapon,
  player: Player,
  room: Room,
  elapsedTime: number,
  onPlayerDamage: (damage: Damage) => void,
) {
  for (const otherPlayer of Object.values(room.players)) {
    if (player.id === otherPlayer.id) {
      continue;
    }

    const [, otherPlayerDamage] = handleCirclesCollision(
      weapon,
      otherPlayer,
      elapsedTime,
    );

    if (otherPlayerDamage > 0) {
      onPlayerDamage({
        type: "weaponCollision",
        damagedPlayerId: otherPlayer.id,
        playerId: player.id,
        amount: otherPlayerDamage / elapsedTime,
      });
    }

    switch (otherPlayer.weapon.type) {
      case "flail":
        handleCirclesCollision(weapon, otherPlayer.weapon, elapsedTime);
        break;
    }
  }
}

export function handleFlailWeaponLimitsCollisions(
  weapon: FlailWeapon,
  player: Player,
  room: Room,
  elapsedTime: number,
) {
  handleCircleCollisionWithLimits(
    weapon,
    room.size.x,
    room.size.y,
    elapsedTime,
  );
}

export function applyFrictionToFlailWeapon(
  weapon: FlailWeapon,
  player: Player,
  room: Room,
  elapsedTime: number,
) {
  applyFriction(weapon, elapsedTime);
}
