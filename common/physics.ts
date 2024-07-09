import { Damage } from "./damage";
import {
  applyFrictionToPlayer,
  handlePlayerCollisions,
  handlePlayerLimitsCollisions,
  movePlayer,
} from "./physics.player";
import {
  applyFrictionToWeapon,
  handleWeaponCollisions,
  handleWeaponLimitsCollisions,
  moveWeapon,
} from "./physics.weapon";
import { Room } from "./types/room";

export function applyPhysics(
  room: Room,
  elapsedTime: number,
  onPlayerDamage: (damage: Damage) => void,
) {
  // Apply physics
  for (const player of Object.values(room.players)) {
    movePlayer(player, room, elapsedTime);
    moveWeapon(player, room, elapsedTime);
  }

  // Handle player and weapon collisions
  const handledPlayerCollisions = new Set<string>();

  for (const player of Object.values(room.players)) {
    handlePlayerCollisions(
      player,
      room,
      handledPlayerCollisions,
      elapsedTime,
      onPlayerDamage,
    );
    handleWeaponCollisions(player, room, elapsedTime, onPlayerDamage);
  }

  // Handle limits collisions
  for (const player of Object.values(room.players)) {
    handlePlayerLimitsCollisions(player, room, elapsedTime);
    handleWeaponLimitsCollisions(player, room, elapsedTime);
  }

  // Apply friction
  for (const player of Object.values(room.players)) {
    applyFrictionToPlayer(player, room, elapsedTime);
    applyFrictionToWeapon(player, room, elapsedTime);
  }
}
