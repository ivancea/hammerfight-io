import { Damage } from "./damage";
import {
  applyFriction,
  handleCircleCollisionWithLimits,
  handleCirclesCollision,
} from "./physics.common";
import { Player } from "./types/player";
import { Room } from "./types/room";
import { add, clampMagnitude, multiply } from "./vector";

export function movePlayer(player: Player, room: Room, elapsedTime: number) {
  // Acceleration increases with the difference between the player's velocity and the expected velocity
  const acceleration = {
    x:
      player.acceleration.x *
      Math.log2(
        Math.max(2, Math.abs(player.acceleration.x - player.velocity.x) / 2),
      ),
    y:
      player.acceleration.y *
      Math.log2(
        Math.max(2, Math.abs(player.acceleration.y - player.velocity.y) / 2),
      ),
  };

  const newPosition = add(
    player.position,
    multiply(player.velocity, elapsedTime),
    multiply(acceleration, 0.5 * elapsedTime * elapsedTime),
  );
  const newVelocity = clampMagnitude(
    add(player.velocity, multiply(acceleration, elapsedTime)),
    room.maxPlayerSpeed,
  );
  player.position = newPosition;
  player.velocity = newVelocity;
}

export function handlePlayerCollisions(
  player: Player,
  room: Room,
  handledCollisions: Set<string>,
  elapsedTime: number,
  onPlayerDamage: (damage: Damage) => void,
) {
  for (const otherPlayer of Object.values(room.players)) {
    if (player.id === otherPlayer.id) {
      continue;
    }
    if (handledCollisions.has(`${player.id}__${otherPlayer.id}`)) {
      continue;
    }
    handledCollisions.add(`${player.id}__${otherPlayer.id}`);
    handledCollisions.add(`${otherPlayer.id}__${player.id}`);

    const [playerDamage, otherPlayerDamage] = handleCirclesCollision(
      player,
      otherPlayer,
    );

    if (playerDamage > 0) {
      onPlayerDamage({
        type: "playerCollision",
        damagedPlayerId: player.id,
        playerId: otherPlayer.id,
        amount: playerDamage / elapsedTime,
      });
    }

    if (otherPlayerDamage > 0) {
      onPlayerDamage({
        type: "playerCollision",
        damagedPlayerId: otherPlayer.id,
        playerId: player.id,
        amount: otherPlayerDamage / elapsedTime,
      });
    }
  }
}

export function handlePlayerLimitsCollisions(player: Player, room: Room) {
  handleCircleCollisionWithLimits(player, room.size.x, room.size.y);
}

export function applyFrictionToPlayer(
  player: Player,
  room: Room,
  elapsedTime: number,
) {
  applyFriction(player, elapsedTime);
}
