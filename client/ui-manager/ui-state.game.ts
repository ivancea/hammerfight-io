import { io, type Socket } from "socket.io-client";
import { assert } from "../../common/errors";
import type {
  SocketIoClientSentEvents,
  SocketIoServerSentEvents,
} from "../../common/types/socket-io";
import { WeaponType } from "../../common/types/weapon";
import { joinUrl } from "../../common/urls";
import { env } from "../env";
import { InputHandlerId } from "../input/input-handler-catalog";
import {
  initializeGame,
  playerDied,
  playerJoined,
  playerLeft,
  playerUpdated,
  roomUpdated,
  stopGame,
} from "../logic";
import { BaseUiState } from "./ui-state";
import { FormUiState } from "./ui-state.form";

export class GameUiState extends BaseUiState {
  username: string;
  inputHandlerId: InputHandlerId;
  weapon: WeaponType;
  roomWithBots: boolean;
  debugMode: boolean;

  socket?: Socket<SocketIoServerSentEvents, SocketIoClientSentEvents>;

  constructor(
    username: string,
    inputHandlerId: InputHandlerId,
    weapon: WeaponType,
    roomWithBots: boolean,
    debugMode: boolean,
  ) {
    super();

    this.username = username;
    this.inputHandlerId = inputHandlerId;
    this.weapon = weapon;
    this.roomWithBots = roomWithBots;
    this.debugMode = debugMode;
  }

  doEnter() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
      stopGame();
    }

    this.socket = io({
      path: joinUrl("/", env.BASE_PATH, "socket.io/"),
    });

    this.socket.on("playerJoined", ({ player }) => {
      console.log(`Player ${player.id} joined the room`);

      playerJoined(player);
    });

    this.socket.on("playerLeft", ({ player }) => {
      console.log(`Player ${player.id} left the room`);

      playerLeft(player);
    });

    this.socket.on("playerDied", ({ player }) => {
      console.log(`Player ${player.id} died`);

      playerDied(player);
    });

    this.socket.on("playerUpdated", ({ player }) => {
      playerUpdated(player);
    });

    this.socket.on("roomUpdated", ({ room }) => {
      roomUpdated(room);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Disconnected from server:", reason);

      stopGame();

      this.resolve(new FormUiState());
    });

    this.socket.emit(
      "requestJoin",
      {
        username: this.username,
        roomWithBots: this.roomWithBots,
        weapon: this.weapon,
      },
      (room, player) => {
        assert(this.socket, "Socket should be defined");
        console.log(`Joined room ${room.id} as player ${player.id}`, room);

        initializeGame(this.socket, room, player, this.inputHandlerId, this.debugMode);
      },
    );
  }

  doExit() {
    this.socket?.disconnect();
    this.socket = undefined;
    stopGame();
  }
}
