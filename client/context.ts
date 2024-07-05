import { Socket } from "socket.io-client";
import { Room } from "../common/types/room";
import {
  SocketIoClientSentEvents,
  SocketIoServerSentEvents,
} from "../common/types/socket-io";

export type Context = {
  socket: Socket<SocketIoServerSentEvents, SocketIoClientSentEvents>;
  room: Room;
  playerId: string;
};
