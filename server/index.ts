import { clampMagnitude } from "../common/vector";
import { env } from "./env";
import { getLogger, initializeLogger } from "./logger";
import { disconnectPlayer, joinPlayer } from "./logic/logic";
import { server } from "./server";
import { getPlayer, getRoom } from "./world";

async function startServer() {
  await initializeLogger();

  server.initialize(env.PORT, env.BASE_PATH);

  server.io.on("connection", (socket) => {
    getLogger().info(`User ${socket.id} connected`);

    socket.on("disconnect", (reason) => {
      getLogger().info(`User disconnected. Reason: ${reason}`);

      const player = getPlayer(socket);

      if (player) {
        disconnectPlayer(player);
      }
    });

    socket.on("requestJoin", (event, callback) => {
      const { room, player } = joinPlayer(
        socket,
        event.username,
        event.roomWithBots,
      );

      getLogger().info(
        `User ${socket.id} with name "${event.username}" joined room ${room.id}`,
      );

      callback(room, player);

      server.broadcastRoom(room).emit("playerJoined", { player });
    });

    socket.on("updateAcceleration", (event) => {
      const player = getPlayer(socket);

      if (!player) {
        return;
      }

      const room = getRoom(player);

      player.acceleration = clampMagnitude(
        event.acceleration,
        room.maxPlayerAcceleration,
      );

      // TODO: Should we send this? Just sending roomUpdated may be enough
      // server.broadcastRoom(room).emit("playerUpdated", { player });
    });
  });

  setInterval(async () => {
    for (const socket of await server.io.fetchSockets()) {
      if (!getPlayer(socket)) {
        getLogger().info(`Removed dangling socket ${socket.id}`);

        socket.disconnect();
      }
    }
  }, 10_000);
}

startServer().catch((error) => {
  getLogger().error(`Failed to start server: ${error}`);
});
