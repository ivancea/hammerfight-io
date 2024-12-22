import { makeBot, Player } from "../../common/types/player";
import { Room } from "../../common/types/room";
import { makeFlailWeapon } from "../../common/types/weapon";
import { world } from "../world";
import { BaseRoomController } from "./room-controller.base";

export class LoadTestRoom extends BaseRoomController {
  static BOT_ID_PREFIX = "_BOT_";

  constructor(private botCount: number) {
    const room = {
      ...BaseRoomController.makeRoom(world.nextRoomId++),
      maxPlayers: botCount + 1,
      size: { x: 1000 * botCount, y: 1000 },
    };

    for (let i = 1; i <= botCount; i++) {
      LoadTestRoom.addBot(i, botCount, room);
    }

    super(room);
  }

  disconnectPlayer(player: Player) {
    super.disconnectPlayer(player);

    const botIndex = Number(player.id.slice(LoadTestRoom.BOT_ID_PREFIX.length));

    LoadTestRoom.addBot(botIndex, this.botCount, this.room);
  }

  static addBot(botNumber: number, botCount: number, room: Room) {
    const botId = `${LoadTestRoom.BOT_ID_PREFIX}${botNumber}`;
    const botName = `BOT ${botNumber}`;
    const position = {
      x: (room.size.x / (botCount + 1)) * botNumber,
      y: room.size.y / 2,
    };

    room.players[botId] = makeBot(botId, room.id, botName, position, makeFlailWeapon(position));
  }
}
