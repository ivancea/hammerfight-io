import Two from "two.js";
import { Line } from "two.js/src/shapes/line";
import { assert } from "../common/errors";
import { Player } from "../common/types/player";
import { SwordWeapon } from "../common/types/weapon";
import { isDebugMode } from "./context";

export function addSwordWeapon(two: Two, weapon: SwordWeapon, player: Player) {
  // Calculate the end point of the sword based on length and rotation
  // The sword extends from the player's center
  const endX = player.position.x + Math.cos(weapon.rotation) * weapon.length;
  const endY = player.position.y + Math.sin(weapon.rotation) * weapon.length;

  // Create a line from player's center to sword tip
  const swordLine = two.makeLine(player.position.x, player.position.y, endX, endY);

  swordLine.id = swordLineId(player);
  swordLine.linewidth = 3; // Make it easily visible
  swordLine.stroke = "#AAAAAA"; // Light gray color

  if (isDebugMode()) {
    // Create angle vector based on rotation and angular speed to visualize it
    const angleVector = {
      x: Math.cos(weapon.rotation) * weapon.angularSpeed * 30,
      y: Math.sin(weapon.rotation) * weapon.angularSpeed * 30,
    };

    // Create a line to show angular speed direction and magnitude
    const angularSpeedLine = two.makeLine(
      weapon.position.x,
      weapon.position.y,
      weapon.position.x + angleVector.x,
      weapon.position.y + angleVector.y,
    );
    angularSpeedLine.id = swordAngularSpeedId(player);
    angularSpeedLine.linewidth = 1;
    angularSpeedLine.stroke = "#0000FF";
  }
}

export function updateSwordWeapon(two: Two, weapon: SwordWeapon, player: Player) {
  const swordLine = two.scene.getById(swordLineId(player)) as Line;

  assert(swordLine, "Sword line not found");

  // Calculate the end point of the sword based on length and rotation
  const endX = player.position.x + Math.cos(weapon.rotation) * weapon.length;
  const endY = player.position.y + Math.sin(weapon.rotation) * weapon.length;

  // Update line vertices to reposition the sword
  swordLine.vertices[0].set(player.position.x, player.position.y);
  swordLine.vertices[1].set(endX, endY);

  if (isDebugMode()) {
    // Create angle vector based on rotation and angular speed
    const angleVector = {
      x: Math.cos(weapon.rotation) * weapon.angularSpeed * 30,
      y: Math.sin(weapon.rotation) * weapon.angularSpeed * 30,
    };

    // Update the debug visualization
    const angularSpeedLine = two.scene.getById(swordAngularSpeedId(player)) as Line;
    assert(angularSpeedLine, "Angular speed line not found");
    // Use updateLine helper function instead of direct vertex manipulation
    angularSpeedLine.vertices[0].set(weapon.position.x, weapon.position.y);
    angularSpeedLine.vertices[1].set(
      weapon.position.x + angleVector.x,
      weapon.position.y + angleVector.y,
    );
  }
}

export function removeSwordWeapon(two: Two, weapon: SwordWeapon, player: Player) {
  const swordLine = two.scene.getById(swordLineId(player));

  assert(swordLine, "Sword line not found");

  two.remove(swordLine);

  if (isDebugMode()) {
    const angularSpeedLine = two.scene.getById(swordAngularSpeedId(player));
    assert(angularSpeedLine, "Angular speed line not found");
    two.remove(angularSpeedLine);
  }
}

/**
 * Generate the ID for the sword line element.
 */
function swordLineId(player: Player) {
  return `weapon_sword__line__${player.id}`;
}

function swordAngularSpeedId(player: Player) {
  return `weapon_sword__angular_speed__${player.id}`;
}

// Removed swordBladeId as we now use swordLineId
