import Two from "two.js";
import { assert } from "../common/errors";
import { Player } from "../common/types/player";
import { AuraWeapon } from "../common/types/weapon";

export function addAuraWeapon(two: Two, weapon: AuraWeapon, player: Player) {
  const aura = two.makeCircle(
    player.position.x,
    player.position.y,
    player.radius + weapon.radiusFromPlayer,
  );

  aura.id = auraId(player);
  aura.stroke = "yellow";
  aura.linewidth = 2;
  aura.noFill();
}

export function updateAuraWeapon(two: Two, weapon: AuraWeapon, player: Player) {
  const aura = two.scene.getById(auraId(player));
  assert(aura, "Aura not found");

  aura.position.set(player.position.x, player.position.y);
}

export function removeAuraWeapon(two: Two, weapon: AuraWeapon, player: Player) {
  const aura = two.scene.getById(auraId(player));
  assert(aura, "Aura not found");

  two.remove(aura);
}

function auraId(player: Player) {
  return `weapon_aura__${player.id}`;
}
