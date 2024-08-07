import { Damage } from "./damage";
import {
  applyFrictionToFlailWeapon,
  handleFlailWeaponCollisions,
  handleFlailWeaponLimitsCollisions,
  moveFlailWeapon,
} from "./physics.weapon.flail";
import { Player } from "./types/player";
import { Room } from "./types/room";

export function moveWeapon(player: Player, room: Room, elapsedTime: number) {
  switch (player.weapon.type) {
    case "flail":
      moveFlailWeapon(player.weapon, player, room, elapsedTime);
      break;
  }
}

export function handleWeaponCollisions(
  player: Player,
  room: Room,
  elapsedTime: number,
  onPlayerDamage: (damage: Damage) => void,
) {
  switch (player.weapon.type) {
    case "flail":
      handleFlailWeaponCollisions(
        player.weapon,
        player,
        room,
        elapsedTime,
        onPlayerDamage,
      );
      break;
  }
}

export function handleWeaponLimitsCollisions(
  player: Player,
  room: Room,
  elapsedTime: number,
) {
  switch (player.weapon.type) {
    case "flail":
      handleFlailWeaponLimitsCollisions(
        player.weapon,
        player,
        room,
        elapsedTime,
      );
      break;
  }
}

export function applyFrictionToWeapon(
  player: Player,
  room: Room,
  elapsedTime: number,
) {
  switch (player.weapon.type) {
    case "flail":
      applyFrictionToFlailWeapon(player.weapon, player, room, elapsedTime);
      break;
  }
}
