import { makeRoom } from "../../common/types/room";
import { world } from "../world";
import { makeBaseRoomController } from "./room-controller.base";

export function makeNormalRoom() {
  const room = makeRoom(world.nextRoomId++);
  const base = makeBaseRoomController(room);

  return {
    room,
    controller: base,
  };
}
