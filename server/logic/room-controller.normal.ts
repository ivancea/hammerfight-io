import { world } from "../world";
import { BaseRoomController } from "./room-controller.base";

export class NormalRoom extends BaseRoomController {
  constructor() {
    super(BaseRoomController.makeRoom(world.nextRoomId++));
  }
}
