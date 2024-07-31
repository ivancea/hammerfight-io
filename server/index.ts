import { clampMagnitude } from "../common/vector";
import { env } from "./env";
import { disconnectPlayer, joinPlayer } from "./logic/logic";
import { server } from "./server";
import { getLogger, initializeLogger } from "./utils/logger";
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

    socket.on("requestJoin", async (event, callback) => {
      getLogger().stats({
        name: "user join request",
        unit: "count",
        value: 1,
      });
      const { room, player } = await joinPlayer(
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
      getLogger().stats({
        name: "user acceleration update",
        unit: "count",
        value: 1,
      });
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

  setInterval(() => {
    void (async () => {
      for (const socket of await server.io.fetchSockets()) {
        if (!getPlayer(socket)) {
          getLogger().info(`Removed dangling socket ${socket.id}`);

          socket.disconnect();
        }
      }
    })();
  }, 10_000);
}

startServer().catch((error: unknown) => {
  getLogger().error(`Failed to start server: ${JSON.stringify(error)}`);
});
