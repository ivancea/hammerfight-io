import Two from "two.js";
import { Line } from "two.js/src/shapes/line";
import { assert } from "../common/errors";
import { Player } from "../common/types/player";
import { SwordWeapon } from "../common/types/weapon";
import { Vector } from "../common/vector";
import { isDebugMode } from "./context";

export function addSwordWeapon(two: Two, weapon: SwordWeapon, player: Player) {
  const tip = getSwordTipPosition(player, weapon);

  const swordBlade = two.makeLine(player.position.x, player.position.y, tip.x, tip.y);
  swordBlade.id = swordBladeId(player);
  swordBlade.linewidth = weapon.width;
  swordBlade.stroke = "#B0B0C0";

  if (isDebugMode()) {
    const tipVel = getSwordTipVelocity(player, weapon);
    const swordVelocity = two.makeLine(tip.x, tip.y, tip.x + tipVel.x, tip.y + tipVel.y);
    swordVelocity.id = swordVelocityId(player);
    swordVelocity.linewidth = 1;
    swordVelocity.stroke = "#0000FF";
  }
}

export function updateSwordWeapon(two: Two, weapon: SwordWeapon, player: Player) {
  const swordBlade = two.scene.getById(swordBladeId(player)) as Line | undefined;
  assert(swordBlade, "Sword blade not found");

  const tip = getSwordTipPosition(player, weapon);

  swordBlade.vertices[0].set(player.position.x, player.position.y);
  swordBlade.vertices[1].set(tip.x, tip.y);

  if (isDebugMode()) {
    const tipVel = getSwordTipVelocity(player, weapon);
    const swordVelocity = two.scene.getById(swordVelocityId(player)) as Line;
    assert(swordVelocity, "Sword velocity not found");
    swordVelocity.vertices[0].set(tip.x, tip.y);
    swordVelocity.vertices[1].set(tip.x + tipVel.x, tip.y + tipVel.y);
  }
}

export function removeSwordWeapon(two: Two, weapon: SwordWeapon, player: Player) {
  const swordBlade = two.scene.getById(swordBladeId(player));
  assert(swordBlade, "Sword blade not found");

  two.remove(swordBlade);

  if (isDebugMode()) {
    const swordVelocity = two.scene.getById(swordVelocityId(player));
    assert(swordVelocity, "Sword velocity not found");
    two.remove(swordVelocity);
  }
}

function getSwordTipPosition(player: Player, weapon: SwordWeapon): Vector {
  return {
    x: player.position.x + Math.cos(weapon.angle) * weapon.length,
    y: player.position.y + Math.sin(weapon.angle) * weapon.length,
  };
}

function getSwordTipVelocity(player: Player, weapon: SwordWeapon): Vector {
  return {
    x: player.velocity.x + -Math.sin(weapon.angle) * weapon.angularVelocity * weapon.length,
    y: player.velocity.y + Math.cos(weapon.angle) * weapon.angularVelocity * weapon.length,
  };
}

function swordBladeId(player: Player) {
  return `weapon_sword__blade__${player.id}`;
}

function swordVelocityId(player: Player) {
  return `weapon_sword__velocity__${player.id}`;
}
