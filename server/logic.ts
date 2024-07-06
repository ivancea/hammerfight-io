import { applyPhysics } from "../common/physics";
import { Room } from "../common/types/room";
import { server } from "./socket-io";

export function updateRoom(room: Room, elapsedTime: number) {
  applyPhysics(room, elapsedTime);

  server.broadcastRoom(room).emit("roomUpdated", { room });
}
