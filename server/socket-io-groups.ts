import { Room } from "../types/room";

export function roomBroadcastGroup(room: Room) {
  return `room:${room.id}`;
}
