import { Player } from "./types/player";
import { Room } from "./types/room";
import { FlailWeapon } from "./types/weapon";
import { add, clamp, clampMagnitude, multiply } from "./vector";

export function applyPhysics(room: Room, elapsedTime: number) {
  for (const player of Object.values(room.players)) {
    movePlayer(player, room, elapsedTime);

    switch (player.weapon.type) {
      case "flail":
        moveFlailWeapon(player.weapon, player, room, elapsedTime);
        break;
    }
  }

  // TODO: Handle collisions:
  // - Player vs player
  // - Player vs weapon
  // - Player vs limits (Remove the clamp from the position calculation)

  // TODO: Report the damages with a callback or return
}

function movePlayer(player: Player, room: Room, elapsedTime: number) {
  // Acceleration increases with the difference between the player's velocity and the expected velocity
  const acceleration = {
    x:
      player.acceleration.x *
      Math.log10(
        Math.max(10, Math.abs(player.acceleration.x - player.velocity.x) / 2),
      ),
    y:
      player.acceleration.y *
      Math.log10(
        Math.max(10, Math.abs(player.acceleration.y - player.velocity.y) / 2),
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

function moveFlailWeapon(
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

  // TODO: Collide with chain length

  weapon.position = newPosition;
  weapon.velocity = newVelocity;
}
