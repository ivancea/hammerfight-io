import { makeBot } from "../../common/types/player";
import { makeRoom } from "../../common/types/room";
import { makeFlailWeapon } from "../../common/types/weapon";
import { world } from "../world";
import { makeBaseRoomController } from "./room-controller.base";

export function makeBotsRoom() {
  const room = makeRoom(world.nextRoomId++);
  const base = makeBaseRoomController(room);

  const botCount = 2;
  for (let i = 0; i < botCount; i++) {
    const botId = `_BOT_${i + 1}`;
    const botName = `BOT ${i + 1}`;
    const position = {
      x: (room.size.x / (botCount + 1)) * (i + 1),
      y: room.size.y / 2,
    };

    room.players[botId] = makeBot(
      botId,
      room.id,
      botName,
      position,
      makeFlailWeapon(position),
    );
  }

  return {
    room,
    controller: base,
  };
}
