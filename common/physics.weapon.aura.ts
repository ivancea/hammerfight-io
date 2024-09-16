import { Damage } from "./damage";
import { handleRawCirclesCollision } from "./physics.common";
import { Player } from "./types/player";
import { Room } from "./types/room";
import { AuraWeapon } from "./types/weapon";

export function handleAuraWeaponCollisions(
  weapon: AuraWeapon,
  player: Player,
  room: Room,
  elapsedTime: number,
  onPlayerDamage: (damage: Damage) => void,
) {
  for (const otherPlayer of Object.values(room.players)) {
    if (player.id === otherPlayer.id) {
      continue;
    }

    const [, otherPlayerWeaponDamage] = handleRawCirclesCollision(
      player,
      player.radius + weapon.radiusFromPlayer,
      player.weight * weapon.playerCollisionWeightMultiplier,
      otherPlayer,
      otherPlayer.radius,
      otherPlayer.weight,
      elapsedTime,
    );

    if (otherPlayerWeaponDamage > 0) {
      onPlayerDamage({
        type: "weaponCollision",
        damagedPlayerId: otherPlayer.id,
        playerId: player.id,
        amount:
          (otherPlayerWeaponDamage * weapon.damageMultiplier) / elapsedTime,
      });
    }

    // Aura weapons only collide with players and other aura weapons
    if (otherPlayer.weapon.type === "aura") {
      const [playerDamage, otherPlayerDamage] = handleRawCirclesCollision(
        player,
        player.radius + weapon.radiusFromPlayer,
        player.weight * weapon.playerCollisionWeightMultiplier,
        otherPlayer,
        otherPlayer.radius + otherPlayer.weapon.radiusFromPlayer,
        otherPlayer.weight * otherPlayer.weapon.playerCollisionWeightMultiplier,
        elapsedTime,
      );

      if (playerDamage > 0) {
        onPlayerDamage({
          type: "weaponCollision",
          damagedPlayerId: player.id,
          playerId: otherPlayer.id,
          amount: playerDamage / elapsedTime,
        });
      }
      if (otherPlayerDamage > 0) {
        onPlayerDamage({
          type: "weaponCollision",
          damagedPlayerId: otherPlayer.id,
          playerId: player.id,
          amount: otherPlayerDamage / elapsedTime,
        });
      }
    }
  }
}
