import Two from "two.js";
import { Group } from "two.js/src/group";
import { Text } from "two.js/src/text";
import { assert } from "../common/errors";
import { Player } from "../common/types/player";
import { Room } from "../common/types/room";
import { Vector } from "../common/types/vector";
import backgroundImage from "./assets/background.jpg";
import { Context } from "./context";

type EventHandlers = {
  onMouseMove: (windowSize: Vector, position: Vector) => void;
};

let two: Two | undefined;

export function initializeGame(context: Context, eventHandlers: EventHandlers) {
  const element = document.getElementById("game");
  assert(element, "Could not find game element");

  two = new Two().appendTo(element);

  const backgroundTexture = two.makeTexture(backgroundImage);
  const backgroundRect = two.makeRectangle(
    context.room.size.x / 2,
    context.room.size.y / 2,
    context.room.size.x,
    context.room.size.y,
  );

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

    eventHandlers.onMouseMove({ x: rect.width, y: rect.height }, { x, y });
  });

  two.play();
}

export function stopGame() {
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

  two.scene.translation.set(
    two.width / 2 - player.position.x,
    two.height / 2 - player.position.y,
  );
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
