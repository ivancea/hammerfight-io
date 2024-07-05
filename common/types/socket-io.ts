import { Player } from "./player";
import { Room } from "./room";

export type SocketIoClientSentEvents = {
  requestJoin: EventWith<
    [
      {
        username: string;
      },
      (room: Room, player: Player) => void,
    ]
  >;
};

export type SocketIoServerSentEvents = {
  playerJoined: EventWith<{
    player: Player;
  }>;
  playerLeft: EventWith<{
    player: Player;
  }>;
  roomUpdated: EventWith<{
    room: Room;
  }>;
};

type EventWith<T> = T extends unknown[]
  ? (...params: T) => void
  : (data: T) => void;
