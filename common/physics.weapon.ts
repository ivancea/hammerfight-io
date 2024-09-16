import { match } from "ts-pattern";
import { Damage } from "./damage";
import { handleAuraWeaponCollisions } from "./physics.weapon.aura";
import {
  applyFrictionToFlailWeapon,
  handleFlailWeaponCollisions,
  handleFlailWeaponLimitsCollisions,
  moveFlailWeapon,
} from "./physics.weapon.flail";
import { Player } from "./types/player";
import { Room } from "./types/room";

export function moveWeapon(player: Player, room: Room, elapsedTime: number) {
  match(player.weapon)
    .with({ type: "flail" }, (weapon) => {
      moveFlailWeapon(weapon, player, room, elapsedTime);
    })
    .with({ type: "aura" }, () => {
      // No-op: Aura weapons don't move
    })
    .exhaustive();
}

export function handleWeaponCollisions(
  player: Player,
  room: Room,
  elapsedTime: number,
  onPlayerDamage: (damage: Damage) => void,
) {
  match(player.weapon)
    .with({ type: "flail" }, (weapon) => {
      handleFlailWeaponCollisions(
        weapon,
        player,
        room,
        elapsedTime,
        onPlayerDamage,
      );
    })
    .with({ type: "aura" }, (weapon) => {
      handleAuraWeaponCollisions(
        weapon,
        player,
        room,
        elapsedTime,
        onPlayerDamage,
      );
    })
    .exhaustive();
}

export function handleWeaponLimitsCollisions(
  player: Player,
  room: Room,
  elapsedTime: number,
) {
  match(player.weapon)
    .with({ type: "flail" }, (weapon) => {
      handleFlailWeaponLimitsCollisions(weapon, player, room, elapsedTime);
    })
    .with({ type: "aura" }, () => {
      // No-op: Aura weapons don't collide with limits
    })
    .exhaustive();
}

export function applyFrictionToWeapon(
  player: Player,
  room: Room,
  elapsedTime: number,
) {
  match(player.weapon)
    .with({ type: "flail" }, (weapon) => {
      applyFrictionToFlailWeapon(weapon, player, room, elapsedTime);
    })
    .with({ type: "aura" }, () => {
      // No-op: Aura weapons don't move, so they don't have friction
    })
    .exhaustive();
}
