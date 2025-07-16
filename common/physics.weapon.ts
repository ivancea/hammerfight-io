import { match } from "ts-pattern";
import { Damage } from "./damage";
import { handleAuraWeaponCollisions } from "./physics.weapon.aura";
import {
  applyFrictionToFlailWeapon,
  handleFlailWeaponCollisions,
  handleFlailWeaponLimitsCollisions,
  moveFlailWeapon,
} from "./physics.weapon.flail";
import {
  applyFrictionToSwordWeapon,
  handleSwordWeaponCollisions,
  handleSwordWeaponLimitsCollisions,
  moveSwordWeapon,
} from "./physics.weapon.sword";
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
    .with({ type: "sword" }, (weapon) => {
      moveSwordWeapon(weapon, player, room, elapsedTime);
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
      handleFlailWeaponCollisions(weapon, player, room, elapsedTime, onPlayerDamage);
    })
    .with({ type: "aura" }, (weapon) => {
      handleAuraWeaponCollisions(weapon, player, room, elapsedTime, onPlayerDamage);
    })
    .with({ type: "sword" }, (weapon) => {
      handleSwordWeaponCollisions(weapon, player, room, elapsedTime, onPlayerDamage);
    })
    .exhaustive();
}

export function handleWeaponLimitsCollisions(player: Player, room: Room, elapsedTime: number) {
  match(player.weapon)
    .with({ type: "flail" }, (weapon) => {
      handleFlailWeaponLimitsCollisions(weapon, player, room, elapsedTime);
    })
    .with({ type: "aura" }, () => {
      // No-op: Aura weapons don't collide with limits
    })
    .with({ type: "sword" }, (weapon) => {
      handleSwordWeaponLimitsCollisions(weapon, player, room, elapsedTime);
    })
    .exhaustive();
}

export function applyFrictionToWeapon(player: Player, room: Room, elapsedTime: number) {
  match(player.weapon)
    .with({ type: "flail" }, (weapon) => {
      applyFrictionToFlailWeapon(weapon, player, room, elapsedTime);
    })
    .with({ type: "aura" }, () => {
      // No-op: Aura weapons don't move, so they don't have friction
    })
    .with({ type: "sword" }, (weapon) => {
      applyFrictionToSwordWeapon(weapon, player, room, elapsedTime);
    })
    .exhaustive();
}
