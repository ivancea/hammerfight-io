import { handleCirclesCollision } from "./physics.common";
import { Player } from "./types/player";
import { Room } from "./types/room";
import { add, clamp, clampMagnitude, multiply } from "./vector";

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

  const newPosition = clamp(
    add(
      player.position,
      multiply(player.velocity, elapsedTime),
      multiply(acceleration, 0.5 * elapsedTime * elapsedTime),
    ),
    0,
    room.size.x,
    0,
    room.size.y,
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

    handleCirclesCollision(player, otherPlayer);
  }
}
