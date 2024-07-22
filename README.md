# HammerFight.io

HammerFight-like multiplayer browser game. Available at [hammerfight.io](https://hammerfight.io).

This game is inspired by the [Hammerfight](https://store.steampowered.com/app/41100/Hammerfight/) game mechanics,
and adds multiplayer capabilities to it.

The multiplayer system is similar to the one in [Agar.io](https://agar.io/), where players join a room, and start fighting each other.

The name and domain, `Hammerfight.io`, is a homage to both games.

> 👀 Want to contribute? Check [the contribution guidelines](./CONTRIBUTING.md)

## How to run

> For cloud deployments, check [Cloud deployment](#cloud-deployment).

The server will open on the configured port, and will also serve the frontend.

### Environment variables

Check [server/env.ts](server/env.ts) to see the available environment variables.
You can copy `.env.defaults` to `.env` and change the values there, as a starting point.

### With Node 20

Run in dev mode with `npm start`.

Run in production mode with `npm run build && npm run serve`.

### With Docker

> 💡 You can define environment variables in the `docker-compose.yml` file directly.
> Remember to also change the `ports` property accordingly.

Run with `docker compose up`.

It will build the client and run the server at container start.
You can modify it to build in a different layer, but you won't be able to change the environment variables dynamically that way.

## Cloud deployment

To deploy the project to the cloud, there's a terraform file at `terraform/`.

> ⚠️ Cloud providers are not configurable. This is the current Hammerfight.io deployment.
> If you have other needs, you may need to modify the terraform files, or do it manually.

Current deployment includes:

- Hetzner servers for the server
- Cloudflare for the DNS A record and SSL certificates

> 💡 You have to pre-configure multiple settings on your Hetzner and Cloudflare accounts, which are not explained here.
> Knowledge of these suppliers is recommended.

You can see the required variables at `terraform/variables.tf`.
You can create a `terraform.tfvars` file with the variables values. Terraform will ask for them on `terraform apply` if you don't provide them.

To deploy, run, in the `terraform/` directory:

```sh
terraform init
terraform apply
```

Note that servers will have a short downtime, as they are destroyed and recreated.

## Client-Server logic

> 💡 Some parts of this section may have not been implemented yet

Logic and physics run both in the client and in the server, as to avoid having things stuck in the client if there's latency spikes.

Every time the server updates something, it's broadcasted to the clients in that room. Clients receive it, and override their local state.
This way, the client both predict the game, while they keep moving.

When players move, a movement command is emitted to the server. The server then validates the movement, and broadcasts it to all the clients in the room.

Latency is the major problem in a real-time game like this one, and future improvements may be done, which may include:

- Reducing the number of players per room, if that is a problem
- Migrating to a faster language. Potentially one with a SocketIO protocol implementation, like Rust. This would mean losing the shared code between client and server however, which could affect client predictability, as well as being more error-prone
- If the amount of data sent in the events affects the times, reduce it to the bare minimum, like just the changed bits of a player or room instead of everything
- If the physics logic is too slow, optimize it. Depending on the problematic part, for example, it could mean adding chunks to the game to optimize collisions (Or some kind of 2D tree)
