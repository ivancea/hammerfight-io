import { makeBot } from "../../common/types/player";
import { makeFlailWeapon, makeSwordWeapon } from "../../common/types/weapon";
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

      // Randomly choose between flail and sword weapon for bots
      const weaponType = Math.random() > 0.5 ? "flail" : "sword";
      const weapon = weaponType === "flail" ? makeFlailWeapon(position) : makeSwordWeapon(position);

      room.players[botId] = makeBot(botId, room.id, botName, position, weapon);
    }

    super(room);
  }
}
