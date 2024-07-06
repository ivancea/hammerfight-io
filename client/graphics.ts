import Two from "two.js";
import { Group } from "two.js/src/group";
import { Text } from "two.js/src/text";
import { assert } from "../common/errors";
import { Player } from "../common/types/player";
import { Room } from "../common/types/room";
import { Vector } from "../common/vector";
import backgroundImage from "./assets/background.jpg";
import { Context } from "./context";

type EventHandlers = {
  onMouseMove: (mousePosition: Vector) => void;
};

let two: Two | undefined;

export function initializeGraphics(
  context: Context,
  eventHandlers: EventHandlers,
) {
  const element = document.getElementById("game");
  assert(element, "Could not find game element");

  two = new Two().appendTo(element);

  const backgroundRect = two.makeRectangle(
    context.room.size.x / 2,
    context.room.size.y / 2,
    context.room.size.x,
    context.room.size.y,
  );
  const backgroundTexture = two.makeTexture(backgroundImage, () => {
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

  backgroundRect.id = "background";
  backgroundRect.fill = backgroundTexture;

  for (const player of Object.values(context.room.players)) {
    internalAddPlayer(player);
  }

  centerPlayer(context);

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
  assert(two, "Game not initialized");

  two.pause();

  const currentElement = getDomElement();
  currentElement.parentNode?.removeChild(currentElement);

  two = undefined;
}

export function updateRoom(context: Context, oldRoom: Room) {
  assert(two, "Game not initialized");

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

  centerPlayer(context);
}

export function updatePlayer(context: Context, player: Player) {
  internalUpdatePlayer(player);

  centerPlayer(context);
}

export function addPlayer(context: Context, player: Player) {
  internalAddPlayer(player);

  centerPlayer(context);
}

export function removePlayer(context: Context, player: Player) {
  internalRemovePlayer(player);

  centerPlayer(context);
}

export function getScreenPlayerPosition(context: Context) {
  assert(two, "Game not initialized");

  const player = context.room.players[context.playerId];
  assert(player, "Player not found");

  return {
    x: player.position.x + two.scene.translation.x,
    y: player.position.y + two.scene.translation.y,
  };

  /*const rect = getDomElement().getBoundingClientRect();
  const minRadius = Math.min(rect.width, rect.height) * 0.1;

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

  two.scene.translation = translationDelta;*/
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

  if (!playerGroup || !playerName) {
    internalAddPlayer(player);
    return;
  }

  playerGroup.position.set(player.position.x, player.position.y);
  playerName.value = player.username;
}

function internalAddPlayer(player: Player) {
  assert(two, "Game not initialized");

  const playerBody = two.makeCircle(0, 0, player.radius);
  playerBody.id = playerBodyId(player);
  playerBody.fill = "#FF8000";

  const playerName = two.makeText(player.username, 0, 0);
  playerName.id = playerNameId(player);

  const playerGroup = two.makeGroup(playerBody, playerName);
  playerGroup.id = playerGroupId(player);
  playerGroup.position.set(player.position.x, player.position.y);
}

function internalRemovePlayer(player: Player) {
  assert(two, "Game not initialized");

  const playerGroup = two.scene.getById(playerGroupId(player));

  assert(playerGroup, "Player group not found");

  playerGroup.remove();
}

function centerPlayer(context: Context) {
  assert(two, "Game not initialized");

  const player = context.room.players[context.playerId];
  assert(player, "Player not found");

  const rect = getDomElement().getBoundingClientRect();
  const minRadius = Math.min(rect.width, rect.height) * 0.1;

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
  return `player_body__${player.id}`;
}

function playerNameId(player: Player) {
  return `player_name__${player.id}`;
}
