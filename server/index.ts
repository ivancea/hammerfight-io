import { clampMagnitude } from "../common/vector";
import { disconnectPlayer, joinPlayer } from "./logic";
import { server } from "./socket-io";
import { getPlayer, getRoom } from "./world";

server.initialize(80);

server.io.on("connection", (socket) => {
  console.log(`User ${socket.id} connected`);

  socket.on("disconnect", (reason) => {
    console.log(`User disconnected. Reason: ${reason}`);

    const player = getPlayer(socket);

    if (player) {
      disconnectPlayer(player);
    }
  });

  socket.on("requestJoin", (event, callback) => {
    const { room, player } = joinPlayer(socket, event.username);

    console.log(
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

    server.broadcastRoom(room).emit("playerUpdated", { player });
  });
});

setInterval(async () => {
  for (const socket of await server.io.fetchSockets()) {
    if (!getPlayer(socket)) {
      console.log(`Removed dangling socket ${socket.id}`);

      socket.disconnect();
    }
  }
}, 10_000);
