import { Room } from "./room";

type JoinEvent = [
  {
    username: string;
  },
  (room: Room) => void,
];

export type SocketIoServerListenEvents = {
  join: EventWith<JoinEvent>;
};

type EventWith<T extends unknown[]> = (...params: T) => void;
