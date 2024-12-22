import { Vector } from "../vector";
import { Player } from "./player";
import { Room } from "./room";
import { WeaponType } from "./weapon";

export type SocketIoClientSentEvents = {
  requestJoin: EventWith<
    [
      {
        username: string;
        roomWithBots: boolean;
        weapon: WeaponType;
      },
      (room: Room, player: Player) => void,
    ]
  >;
  updateAcceleration: EventWith<{
    acceleration: Vector;
  }>;
};

export type SocketIoServerSentEvents = {
  playerJoined: EventWith<{
    player: Player;
  }>;
  playerLeft: EventWith<{
    player: Player;
  }>;
  playerUpdated: EventWith<{
    player: Player;
  }>;
  playerDied: EventWith<{
    player: Player;
  }>;
  roomUpdated: EventWith<{
    room: Room;
  }>;
};

type EventWith<T> = T extends unknown[] ? (...params: T) => void : (data: T) => void;
