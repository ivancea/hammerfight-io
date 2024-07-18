import { hashCode } from "../client/utils";
import { AI_CONTEXT_SYMBOL, Player } from "../common/types/player";
import { Room } from "../common/types/room";
import {
  add,
  magnitude,
  rotate,
  subtract,
  withMagnitude,
} from "../common/vector";

const botMessages = [
  "Come here <PLAYER_NAME>!",
  "Fight you coward!",
  "Let me hit that ass!",
  "Is that all the balls you have?",
  "Are you scared <PLAYER_NAME>?",
  "I'll end you in no time!",
  "Are they sending children to fight now?",
  "Isn't it bedtime for you?",
];

export function updateBots(room: Room, elapsedTime: number) {
  const firstPlayer = Object.values(room.players).find((p) => !p.isBot);

  for (const bot of Object.values(room.players).filter((p) => p.isBot)) {
    updateBotName(bot, firstPlayer);

    const currentSpeed = magnitude(bot.velocity);

    const currentSpeedPercentage =
      Math.max(0, Math.min(room.maxPlayerSpeed, currentSpeed)) /
      room.maxPlayerSpeed;
    const angle = (Math.PI * currentSpeedPercentage) / 1.5;

    let newAcceleration = withMagnitude(
      currentSpeed === 0
        ? { x: Math.random() - 0.5, y: Math.random() - 0.5 }
        : rotate(bot.velocity, angle),
      room.maxPlayerAcceleration,
    );

    if (firstPlayer) {
      const otherBots = Object.values(room.players).filter(
        (p) => p.isBot && p.id !== bot.id,
      );

      let accelerationAgainstBots = otherBots.reduce(
        (acc, otherBot) => {
          const vectorFromOtherBot = subtract(bot.position, otherBot.position);

          if (magnitude(vectorFromOtherBot) > 300) {
            return acc;
          }

          return add(
            acc,
            withMagnitude(vectorFromOtherBot, room.maxPlayerAcceleration),
          );
        },
        { x: 0, y: 0 },
      );

      if (accelerationAgainstBots.x !== 0 || accelerationAgainstBots.y !== 0) {
        accelerationAgainstBots = withMagnitude(
          accelerationAgainstBots,
          room.maxPlayerAcceleration / 1.5,
        );
      }

      const vectorToPlayer = withMagnitude(
        subtract(firstPlayer.position, bot.position),
        room.maxPlayerAcceleration / 1.5,
      );

      newAcceleration = withMagnitude(
        add(newAcceleration, vectorToPlayer, accelerationAgainstBots),
        room.maxPlayerAcceleration,
      );
    }

    bot.acceleration = newAcceleration;
  }
}

function updateBotName(bot: Player, targetPlayer: Player | undefined) {
  const millisecondsBetweenUpdates = 5000;
  const now = Date.now();
  if (
    (bot[AI_CONTEXT_SYMBOL]?.lastNameUpdate ?? 0) >=
    Date.now() - millisecondsBetweenUpdates
  ) {
    return;
  }

  if (!bot[AI_CONTEXT_SYMBOL]) {
    bot[AI_CONTEXT_SYMBOL] = {
      lastNameUpdate: 0,
    };
  }
  bot[AI_CONTEXT_SYMBOL].lastNameUpdate = now;

  const offset = Math.floor(
    hashCode(bot.id) + now / millisecondsBetweenUpdates,
  );

  const botName = bot.username.split(":", 2)[0] ?? "";
  if (targetPlayer) {
    const message = botMessages[offset % botMessages.length]?.replace(
      /<PLAYER_NAME>/g,
      targetPlayer.username,
    );

    bot.username = `${botName}: ${message}`;
  } else {
    bot.username = botName;
  }
}
