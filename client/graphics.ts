import Two from "two.js";
import { Group } from "two.js/src/group";
import { Line } from "two.js/src/shapes/line";
import { Rectangle } from "two.js/src/shapes/rectangle";
import { Text } from "two.js/src/text";
import { assert } from "../common/errors";
import { Player } from "../common/types/player";
import { Room } from "../common/types/room";
import { Vector } from "../common/vector";
import backgroundImage from "./assets/background.jpg";
import { getContext, isDebugMode, isPlayerAlive } from "./context";
import {
  addFlailWeapon,
  removeFlailWeapon,
  updateFlailWeapon,
} from "./graphics.weapons.flail";

type EventHandlers = {
  onMouseMove: (mousePosition: Vector) => void;
};

let two: Two | undefined;
let resizeObserver: ResizeObserver | undefined;

export function initializeGraphics(eventHandlers: EventHandlers) {
  const context = getContext();
  const element = document.getElementById("game");
  assert(element, "Could not find game element");

  two = new Two().appendTo(element);

  function resizeElement() {
    assert(two, "Game not initialized");

    const rect = getDomElement().getBoundingClientRect();
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

  getDomElement().addEventListener("mousemove", (event) => {
    assert(two, "Game not initialized");

    const rect = getDomElement().getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    eventHandlers.onMouseMove({ x, y });
  });

  two.play();
}

export function destroyGraphics() {
  resizeObserver?.disconnect();

  if (!two) {
    return;
  }

  two.pause();

  const currentElement = getDomElement();
  currentElement.parentNode?.removeChild(currentElement);

  two = undefined;
}

export function updateRoom(oldRoom: Room) {
  assert(two, "Game not initialized");
  const context = getContext();

  // Remove removed players
  for (const oldPlayer of Object.values(oldRoom.players)) {
    if (!context.room.players[oldPlayer.id]) {
      internalRemovePlayer(oldPlayer);
    }
  }

  // Update or add new players
  for (const player of Object.values(context.room.players)) {
    internalUpdatePlayer(player);
  }

  centerPlayer();
}

export function updatePlayer(player: Player) {
  internalUpdatePlayer(player);

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
  assert(two, "Game not initialized");
  const context = getContext();

  const player = context.room.players[context.playerId];
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
  assert(two, "Game not initialized");

  const playerGroup = two.scene.getById(playerGroupId(player)) as
    | Group
    | undefined;
  const playerName = playerGroup?.getById(playerNameId(player)) as
    | Text
    | undefined;
  const playerHealthHealth = playerGroup?.getById(
    playerHealthHealthId(player),
  ) as Rectangle | undefined;

  if (!playerGroup || !playerName || !playerHealthHealth) {
    internalAddPlayer(player);
    return;
  }

  playerGroup.position.set(player.position.x, player.position.y);
  playerName.value = player.username;

  const healthPercentage = player.health / player.maxHealth;
  const totalHealthPixels = player.radius * 2 - 2;
  const healthPixels = Math.ceil(totalHealthPixels * healthPercentage);
  playerHealthHealth.position.set(
    -(totalHealthPixels - healthPixels) / 2,
    -player.radius - 5,
  );
  playerHealthHealth.width = healthPixels;

  switch (player.weapon.type) {
    case "flail": {
      updateFlailWeapon(two, player.weapon, player);
      break;
    }
  }

  if (isDebugMode()) {
    const playerVelocity = two.scene.getById(playerVelocityId(player)) as Line;
    playerVelocity.vertices[1].set(player.velocity.x, player.velocity.y);
  }
}

function internalAddPlayer(player: Player) {
  assert(two, "Game not initialized");

  const playerBody = two.makeCircle(0, 0, player.radius);
  playerBody.id = playerBodyId(player);
  playerBody.fill = "#FF8000";

  const playerName = two.makeText(player.username, 0, 0);
  playerName.id = playerNameId(player);

  const playerHealthBackground = two.makeRectangle(
    0,
    -player.radius - 5,
    player.radius * 2,
    6,
  );
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

  switch (player.weapon.type) {
    case "flail": {
      addFlailWeapon(two, player.weapon, player);
      break;
    }
  }

  if (isDebugMode()) {
    const playerVelocity = two.makeLine(
      0,
      0,
      player.velocity.x,
      player.velocity.y,
    );
    playerVelocity.id = playerVelocityId(player);
    playerVelocity.linewidth = 1;
    playerVelocity.stroke = "#0000FF";

    playerGroup.add(playerVelocity);
  }
}

function internalRemovePlayer(player: Player) {
  assert(two, "Game not initialized");

  const playerGroup = two.scene.getById(playerGroupId(player));

  assert(playerGroup, "Player group not found");

  playerGroup.remove();

  switch (player.weapon.type) {
    case "flail": {
      removeFlailWeapon(two, player.weapon, player);
      break;
    }
  }

  if (isDebugMode()) {
    const playerVelocity = two.scene.getById(playerVelocityId(player));
    assert(playerVelocity, "Player velocity not found");

    playerVelocity.remove();
  }
}

function centerPlayer() {
  if (!isPlayerAlive()) {
    return;
  }

  assert(two, "Game not initialized");
  const context = getContext();

  const player = context.room.players[context.playerId];
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
  assert(two, "Game not initialized");

  return two.renderer.domElement as HTMLElement;
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
