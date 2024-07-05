import { Room } from "../common/types/room";
import { server } from "./socket-io";

export function updateRoom(room: Room) {
  for (const player of Object.values(room.players)) {
    player.position.x += Math.random() * 10 - 5;
    player.position.y += Math.random() * 10 - 5;
  }

  server.broadcastRoom(room).emit("roomUpdated", { room });
}
