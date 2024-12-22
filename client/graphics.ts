import * as Three from "three";
import { match } from "ts-pattern";
import Two from "two.js";
import { Texture } from "two.js/src/effects/texture";
import { Group } from "two.js/src/group";
import { Circle } from "two.js/src/shapes/circle";
import { Line } from "two.js/src/shapes/line";
import { Rectangle } from "two.js/src/shapes/rectangle";
import { Text } from "two.js/src/text";
import { assert } from "../common/errors";
import { Player } from "../common/types/player";
import { Room } from "../common/types/room";
import { hashCode } from "../common/utils";
import backgroundImage from "./assets/background.jpg";
import { getContext, getCurrentPlayer, isDebugMode, isPlayerAlive } from "./context";
import { getTextures, SHIP_IMAGE_SIZE } from "./graphics.textures";
import { addAuraWeapon, removeAuraWeapon, updateAuraWeapon } from "./graphics.weapons.aura";
import {
  addFlailWeapon,
  addFlailWeapon3D,
  removeFlailWeapon,
  removeFlailWeapon3D,
  updateFlailWeapon,
  updateFlailWeapon3D,
} from "./graphics.weapons.flail";

let scene: Three.Scene | undefined;
let camera: Three.PerspectiveCamera | undefined;
let renderer: Three.WebGLRenderer | undefined;

let two: Two | undefined;
let resizeObserver: ResizeObserver | undefined;

export function initializeGraphics() {
  const context = getContext();
  const element = document.getElementById("game");
  assert(element, "Could not find game element");

  scene = new Three.Scene();
  camera = new Three.PerspectiveCamera(75, 1, 0.1, 1000);
  renderer = new Three.WebGLRenderer();
  renderer.setSize(element.clientWidth, element.clientHeight);
  element.appendChild(renderer.domElement);

  two = new Two({
    type: Two.Types.canvas,
    fitted: true,
  }) /*.appendTo(element)*/;

  function resizeElement() {
    assert(two && renderer, "Game not initialized");

    const rect = getDomElement().getBoundingClientRect();
    renderer.setSize(rect.width, rect.height);
    two.renderer.setSize(rect.width, rect.height);
  }

  resizeObserver = new ResizeObserver(resizeElement);
  resizeObserver.observe(element);
  resizeElement();

  const backgroundRect = two.makeRectangle(
    context.room.size.x / 2,
    context.room.size.y / 2,
    context.room.size.x,
    context.room.size.y,
  );
  const backgroundTexture = two.makeTexture(backgroundImage, () => {
    setTimeout(() => {
      const image = backgroundTexture.image as HTMLImageElement;
      const imageWidth = image.naturalWidth;
      const imageHeight = image.naturalHeight;

      backgroundRect.width = imageWidth;
      backgroundRect.height = imageHeight;
      backgroundRect.scale = new Two.Vector(
        context.room.size.x / imageWidth,
        context.room.size.y / imageHeight,
      );
    });
  });

  backgroundRect.id = "background";
  backgroundRect.fill = backgroundTexture;

  for (const player of Object.values(context.room.players)) {
    internalAddPlayer(player);
  }

  centerPlayer();

  two.play();

  renderer.setAnimationLoop(() => {
    assert(scene && renderer && camera, "Game not initialized");

    // TODO: Render/Update everything

    renderer.render(scene, camera);
  });

  return getDomElement();
}

export function destroyGraphics() {
  resizeObserver?.disconnect();

  if (!two || !renderer) {
    return;
  }

  two.pause();
  renderer.dispose();

  const currentElement = getDomElement();
  currentElement.parentNode?.removeChild(currentElement);

  scene = camera = renderer = undefined;
  two = undefined;
}

export function updateRoom(oldRoom: Room) {
  assert(two, "Game not initialized");
  const context = getContext();

  // Remove removed players
  for (const oldPlayer of Object.values(oldRoom.players)) {
    if (!context.room.players[oldPlayer.id]) {
      internalRemovePlayer(oldPlayer);
      internalRemovePlayer3D(oldPlayer);
    }
  }

  // Update or add new players
  for (const player of Object.values(context.room.players)) {
    internalUpdatePlayer(player);
    internalUpdatePlayer3D(player);
  }

  centerPlayer();
}

export function updatePlayer(player: Player) {
  internalUpdatePlayer(player);
  internalUpdatePlayer3D(player);

  centerPlayer();
}

export function addPlayer(player: Player) {
  internalAddPlayer(player);

  centerPlayer();
}

export function removePlayer(player: Player) {
  internalRemovePlayer(player);

  if (player.id !== getContext().playerId) {
    centerPlayer();
  }
}

export function getScreenPlayerPosition() {
  // TODO: Remove me for 3D
  assert(two, "Game not initialized");

  const player = getCurrentPlayer();
  assert(player, "Player not found");

  return {
    x: player.position.x + two.scene.translation.x,
    y: player.position.y + two.scene.translation.y,
  };
}

export function getScreenSize() {
  const rect = getDomElement().getBoundingClientRect();

  return { x: rect.width, y: rect.height };
}

function internalUpdatePlayer(player: Player) {
  assert(two && scene, "Game not initialized");

  const playerGroup = two.scene.getById(playerGroupId(player)) as Group | undefined;
  const playerBody = playerGroup?.getById(playerBodyId(player)) as Circle | undefined;
  const playerName = playerGroup?.getById(playerNameId(player)) as Text | undefined;
  const playerHealthHealth = playerGroup?.getById(playerHealthHealthId(player)) as
    | Rectangle
    | undefined;

  if (!playerGroup || !playerBody || !playerName || !playerHealthHealth) {
    internalAddPlayer(player);
    return;
  }

  playerGroup.position.set(player.position.x, player.position.y);
  playerName.value = player.username;
  playerBody.scale = (player.radius * 2) / SHIP_IMAGE_SIZE;

  const healthPercentage = player.health / player.maxHealth;
  const totalHealthPixels = player.radius * 2 - 2;
  const healthPixels = Math.ceil(totalHealthPixels * healthPercentage);
  playerHealthHealth.position.set(-(totalHealthPixels - healthPixels) / 2, -player.radius - 5);
  playerHealthHealth.width = healthPixels;

  match(player.weapon)
    .with({ type: "flail" }, (weapon) => {
      assert(two, "Game not initialized");
      updateFlailWeapon(two, weapon, player);
    })
    .with({ type: "aura" }, (weapon) => {
      assert(two, "Game not initialized");
      updateAuraWeapon(two, weapon, player);
    })
    .exhaustive();

  if (isDebugMode()) {
    const playerVelocity = two.scene.getById(playerVelocityId(player)) as Line;
    playerVelocity.vertices[1].set(player.velocity.x, player.velocity.y);
  }
}

function internalUpdatePlayer3D(player: Player) {
  assert(scene, "Game not initialized");

  const playerGroup = scene.getObjectByName(playerGroupId(player)) as Three.Group | undefined;
  const playerBody = playerGroup?.getObjectByName(playerBodyId(player)) as Three.Mesh | undefined;

  if (!playerGroup || !playerBody) {
    internalAddPlayer3D(player);
    return;
  }

  playerGroup.position.set(player.position.x, player.position.y, player.position.z);
  updateCamera3D(player);

  match(player.weapon)
    .with({ type: "flail" }, (weapon) => {
      assert(scene, "Game not initialized");
      updateFlailWeapon3D(scene, weapon, player);
    })
    .with({ type: "aura" }, (weapon) => {
      assert(scene, "Game not initialized");
      //updateAuraWeapon(two, weapon, player);
    })
    .exhaustive();

  /*if (isDebugMode()) {
    const playerVelocity = two.scene.getById(playerVelocityId(player)) as Line;
    playerVelocity.vertices[1].set(player.velocity.x, player.velocity.y);
  }*/
}

function internalAddPlayer(player: Player) {
  assert(two, "Game not initialized");

  const playerBody = two.makeCircle(0, 0, SHIP_IMAGE_SIZE / 2);
  playerBody.id = playerBodyId(player);
  playerBody.scale = (player.radius * 2) / SHIP_IMAGE_SIZE;
  playerBody.noStroke();
  const shipTextures = getTextures(two).ships;
  playerBody.fill = shipTextures[hashCode(player.id) % shipTextures.length] as Texture;

  const playerName = two.makeText(
    player.username,
    0,
    -player.radius - 2 - 7 - 8, // -Radius - margin - halfTextSize - healthBar
  );
  playerName.id = playerNameId(player);
  playerName.size = 16;
  playerName.weight = 700;

  const playerHealthBackground = two.makeRectangle(0, -player.radius - 5, player.radius * 2, 6);
  playerHealthBackground.id = playerHealthBackgroundId(player);
  playerHealthBackground.fill = "#111111";
  playerHealthBackground.noStroke();

  const healthPercentage = player.health / player.maxHealth;
  const totalHealthPixels = player.radius * 2 - 2;
  const healthPixels = Math.ceil(totalHealthPixels * healthPercentage);
  const playerHealthHealth = two.makeRectangle(
    -(totalHealthPixels - healthPixels) / 2,
    -player.radius - 5,
    healthPixels,
    4,
  );
  playerHealthHealth.id = playerHealthHealthId(player);
  playerHealthHealth.fill = "#FF0000";
  playerHealthHealth.noStroke();

  const playerGroup = two.makeGroup(
    playerBody,
    playerName,
    playerHealthBackground,
    playerHealthHealth,
  );
  playerGroup.id = playerGroupId(player);
  playerGroup.position.set(player.position.x, player.position.y);

  match(player.weapon)
    .with({ type: "flail" }, (weapon) => {
      assert(two, "Game not initialized");
      addFlailWeapon(two, weapon, player);
    })
    .with({ type: "aura" }, (weapon) => {
      assert(two, "Game not initialized");
      addAuraWeapon(two, weapon, player);
    })
    .exhaustive();

  if (isDebugMode()) {
    const playerVelocity = two.makeLine(0, 0, player.velocity.x, player.velocity.y);
    playerVelocity.id = playerVelocityId(player);
    playerVelocity.linewidth = 1;
    playerVelocity.stroke = "#0000FF";

    playerGroup.add(playerVelocity);
  }
}

function internalAddPlayer3D(player: Player) {
  assert(scene, "Game not initialized");

  const material = new Three.MeshBasicMaterial({ color: 0x00ff00 });
  material.wireframe = true;
  const playerBodyGeometry = new Three.SphereGeometry();
  const playerBody = new Three.Mesh(playerBodyGeometry, material);
  playerBody.name = playerBodyId(player);
  playerBody.scale.setLength(player.radius);

  const playerGroup = new Three.Group();
  playerGroup.name = playerGroupId(player);
  playerGroup.add(playerBody);
  playerGroup.position.set(player.position.x, player.position.y, player.position.z);

  scene.add(playerGroup);

  updateCamera3D(player);

  match(player.weapon)
    .with({ type: "flail" }, (weapon) => {
      assert(scene, "Game not initialized");
      addFlailWeapon3D(scene, weapon, player);
    })
    .with({ type: "aura" }, (weapon) => {
      assert(scene, "Game not initialized");
      //addAuraWeapon(two, weapon, player);
    })
    .exhaustive();

  /*if (isDebugMode()) {
    const playerVelocity = two.makeLine(0, 0, player.velocity.x, player.velocity.y);
    playerVelocity.id = playerVelocityId(player);
    playerVelocity.linewidth = 1;
    playerVelocity.stroke = "#0000FF";

    playerGroup.add(playerVelocity);
  }*/
}

function internalRemovePlayer(player: Player) {
  assert(two, "Game not initialized");

  const playerGroup = two.scene.getById(playerGroupId(player)) as Group | undefined;

  assert(playerGroup, "Player group not found");

  playerGroup.remove();

  match(player.weapon)
    .with({ type: "flail" }, (weapon) => {
      assert(two, "Game not initialized");
      removeFlailWeapon(two, weapon, player);
    })
    .with({ type: "aura" }, (weapon) => {
      assert(two, "Game not initialized");
      removeAuraWeapon(two, weapon, player);
    })
    .exhaustive();

  if (isDebugMode()) {
    const playerVelocity = two.scene.getById(playerVelocityId(player));
    assert(playerVelocity, "Player velocity not found");

    playerVelocity.remove();
  }
}

function internalRemovePlayer3D(player: Player) {
  assert(scene, "Game not initialized");

  const playerGroup = scene.getObjectByName(playerGroupId(player)) as Three.Group | undefined;

  assert(playerGroup, "Player group not found");

  playerGroup.removeFromParent();

  match(player.weapon)
    .with({ type: "flail" }, (weapon) => {
      assert(scene, "Game not initialized");
      removeFlailWeapon3D(scene, weapon, player);
    })
    .with({ type: "aura" }, (weapon) => {
      assert(scene, "Game not initialized");
      // removeAuraWeapon(two, weapon, player);
    })
    .exhaustive();

  /*if (isDebugMode()) {
    const playerVelocity = two.scene.getById(playerVelocityId(player));
    assert(playerVelocity, "Player velocity not found");

    playerVelocity.remove();
  }*/
}

function updateCamera3D(player: Player) {
  if (player.id !== getContext().playerId) {
    return;
  }

  assert(camera, "Game not initialized");

  camera.position.set(player.position.x, player.position.y, player.position.z + player.radius * 20);
}

function centerPlayer() {
  if (!isPlayerAlive()) {
    return;
  }

  assert(two, "Game not initialized");

  const player = getCurrentPlayer();
  assert(player, "Player not found");

  const rect = getDomElement().getBoundingClientRect();
  const minRadius = Math.min(rect.width, rect.height) * 0.2;

  const currentTranslation = two.scene.translation;
  const targetTranslation = new Two.Vector(
    two.width / 2 - player.position.x,
    two.height / 2 - player.position.y,
  );

  const delta = targetTranslation.clone().sub(currentTranslation);

  // If inside a minimum radius, don't move
  if (delta.length() < minRadius) {
    return;
  }

  const translationDelta = currentTranslation
    .clone()
    .add(delta.setLength(delta.length() - minRadius));

  two.scene.translation = translationDelta;
}

function getDomElement() {
  assert(renderer, "Game not initialized");

  return renderer.domElement.parentElement as HTMLElement;
  //return two.renderer.domElement as HTMLElement;
}

function playerGroupId(player: Player) {
  return `player__${player.id}`;
}

function playerBodyId(player: Player) {
  return `player__body__${player.id}`;
}

function playerNameId(player: Player) {
  return `player__name__${player.id}`;
}

function playerHealthBackgroundId(player: Player) {
  return `player__health_background__${player.id}`;
}

function playerHealthHealthId(player: Player) {
  return `player__health_health__${player.id}`;
}

function playerVelocityId(player: Player) {
  return `player__velocity__${player.id}`;
}
