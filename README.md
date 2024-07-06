# HammerFight.io

HammerFight-like browser game.

## Client-Server logic

Logic and physics run both in the client and in the server, as to avoid having things stuck in the client if there's latency spikes.

Every time the server updates something, it's broadcasted to the clients in that room. Clients receive it, and override their local state.
This way, the client both predict the game, while they keep moving.

When players move, a movement command is emitted to the server. The server then validates the movement, and broadcasts it to all the clients in the room.

Latency is the major problem in a real-time game like this one, and future improvements may be done, which may include:

- Reducing the number of players per room, if that is a problem
- Migrating to a faster language. Potentially one with a SocketIO protocol implementation, like Rust. This would mean losing the shared code between client and server however, which could affect client predictability, as well as being more error-prone
- If the amount of data sent in the events affects the times, reduce it to the bare minimum, like just the changed bits of a player or room instead of everything
- If the physics logic is too slow, optimize it. Depending on the problematic part, for example, it could mean adding chunks to the game to optimize collisions (Or some kind of 2D tree)