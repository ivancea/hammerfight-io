import { handleCirclesCollision } from "./physics.common";
import { ELASTICITY } from "./physics.constants";
import { Player } from "./types/player";
import { Room } from "./types/room";
import { FlailWeapon } from "./types/weapon";
import {
  add,
  clamp,
  clampMagnitude,
  magnitude,
  multiply,
  subtract,
} from "./vector";

export function moveFlailWeapon(
  weapon: FlailWeapon,
  player: Player,
  room: Room,
  elapsedTime: number,
) {
  const acceleration = room.gravity;

  const newPosition = clamp(
    add(
      weapon.position,
      multiply(weapon.velocity, elapsedTime),
      multiply(acceleration, 0.5 * elapsedTime * elapsedTime),
    ),
    0,
    room.size.x,
    0,
    room.size.y,
  );
  const newVelocity = clampMagnitude(
    add(weapon.velocity, multiply(acceleration, elapsedTime)),
    weapon.maxSpeed,
  );

  weapon.position = newPosition;
  weapon.velocity = newVelocity;

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
      multiply(positionDelta, ELASTICITY),
    );
  }
}

export function handleFlailWeaponCollisions(
  weapon: FlailWeapon,
  player: Player,
  room: Room,
) {
  for (const otherPlayer of Object.values(room.players)) {
    if (player.id === otherPlayer.id) {
      continue;
    }

    handleCirclesCollision(weapon, otherPlayer);

    switch (otherPlayer.weapon.type) {
      case "flail":
        handleCirclesCollision(weapon, otherPlayer.weapon);
        break;
    }
  }

  // TODO: Reapply the chain constraint?
}
