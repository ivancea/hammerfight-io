import {
  handleFlailWeaponCollisions,
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

export function handleWeaponCollisions(player: Player, room: Room) {
  switch (player.weapon.type) {
    case "flail":
      handleFlailWeaponCollisions(player.weapon, player, room);
      break;
  }
}
