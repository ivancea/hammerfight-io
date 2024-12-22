import { makeBot } from "../../common/types/player";
import { makeFlailWeapon } from "../../common/types/weapon";
import { world } from "../world";
import { BaseRoomController } from "./room-controller.base";

export class BotsRoom extends BaseRoomController {
  constructor(botCount = 2) {
    const room = BaseRoomController.makeRoom(world.nextRoomId++);

    for (let i = 0; i < botCount; i++) {
      const botId = `_BOT_${i + 1}`;
      const botName = `BOT ${i + 1}`;
      const position = {
        x: (room.size.x / (botCount + 1)) * (i + 1),
        y: room.size.y / 2,
      };

      room.players[botId] = makeBot(botId, room.id, botName, position, makeFlailWeapon(position));
    }

    super(room);
  }
}
