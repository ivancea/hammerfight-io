import Two from "two.js";
import { Line } from "two.js/src/shapes/line";
import { assert } from "../common/errors";
import { Player } from "../common/types/player";
import { FlailWeapon } from "../common/types/weapon";
import { isDebugMode } from "./context";

export function addFlailWeapon(two: Two, weapon: FlailWeapon, player: Player) {
  const flailHead = two.makeCircle(
    weapon.position.x,
    weapon.position.y,
    weapon.radius,
  );
  flailHead.id = flailHeadId(player);
  flailHead.fill = "#FF0000";

  const flailChain = two.makeLine(
    weapon.position.x,
    weapon.position.y,
    player.position.x,
    player.position.y,
  );
  flailChain.id = flailChainId(player);
  flailChain.linewidth = 2;
  flailChain.stroke = "#AA0000";

  if (isDebugMode()) {
    const flailVelocity = two.makeLine(
      weapon.position.x,
      weapon.position.y,
      weapon.position.x + weapon.velocity.x,
      weapon.position.y + weapon.velocity.y,
    );
    flailVelocity.id = flailVelocityId(player);
    flailVelocity.linewidth = 1;
    flailVelocity.stroke = "#0000FF";
  }
}

export function updateFlailWeapon(
  two: Two,
  weapon: FlailWeapon,
  player: Player,
) {
  const flailHead = two.scene.getById(flailHeadId(player));
  const flailChain = two.scene.getById(flailChainId(player)) as
    | Line
    | undefined;
  assert(flailHead, "Flail head not found");
  assert(flailChain, "Flail chain not found");

  flailHead.position.set(weapon.position.x, weapon.position.y);
  flailChain.vertices[0].set(weapon.position.x, weapon.position.y);
  flailChain.vertices[1].set(player.position.x, player.position.y);

  if (isDebugMode()) {
    const flailVelocity = two.scene.getById(flailVelocityId(player)) as Line;
    assert(flailVelocity, "Flail velocity not found");
    flailVelocity.vertices[0].set(weapon.position.x, weapon.position.y);
    flailVelocity.vertices[1].set(
      weapon.position.x + weapon.velocity.x,
      weapon.position.y + weapon.velocity.y,
    );
  }
}

export function removeFlailWeapon(
  two: Two,
  weapon: FlailWeapon,
  player: Player,
) {
  const flailHead = two.scene.getById(flailHeadId(player));
  const flailChain = two.scene.getById(flailChainId(player));
  assert(flailHead, "Flail head not found");
  assert(flailChain, "Flail chain not found");

  two.remove(flailHead);
  two.remove(flailChain);

  if (isDebugMode()) {
    const flailVelocity = two.scene.getById(flailVelocityId(player));
    assert(flailVelocity, "Flail velocity not found");
    two.remove(flailVelocity);
  }
}

function flailHeadId(player: Player) {
  return `weapon_flail__head__${player.id}`;
}

function flailChainId(player: Player) {
  return `weapon_flail__chain__${player.id}`;
}

function flailVelocityId(player: Player) {
  return `weapon_flail__velocity__${player.id}`;
}
