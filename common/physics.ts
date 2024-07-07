import { handlePlayerCollisions, movePlayer } from "./physics.player";
import { handleWeaponCollisions, moveWeapon } from "./physics.weapon";
import { Room } from "./types/room";

export function applyPhysics(
  room: Room,
  elapsedTime: number,
  /*onPlayerDamage: (
    damagedPlayer: Player,
    damagingPlayer: Player,
    damage: number,
  ) => void,*/
) {
  // Apply physics
  for (const player of Object.values(room.players)) {
    movePlayer(player, room, elapsedTime);
    moveWeapon(player, room, elapsedTime);
  }

  // Handle collisions

  /**
   * Already handled player collisions.
   *
   * Each entry is a string with the format `${playerId1}__${playerId2}`.
   * For each collision, 2 entries are added, 1-2 and 2-1.
   */
  const handledPlayerCollisions = new Set<string>();

  for (const player of Object.values(room.players)) {
    handlePlayerCollisions(player, room, handledPlayerCollisions);
    handleWeaponCollisions(player, room);
  }

  // TODO: At the end, apply friction with  mul(velocity, Math.pow(FRICTION_CONSTANT, elapsedTime))

  // TODO: Handle collisions:
  // - Player vs player
  // - Player vs weapon
  // - Player vs limits (Remove the clamp from the position calculation)

  // TODO: Report the damages with a callback or return
}
