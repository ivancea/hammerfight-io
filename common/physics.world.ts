import RAPIER from "@dimforge/rapier2d-compat";
import { match } from "ts-pattern";
import { Damage } from "./damage";
import { Player } from "./types/player";
import { Room } from "./types/room";
import type { AuraWeapon, FlailWeapon, SwordWeapon } from "./types/weapon";

// Rapier initialisation

export async function initRapier(): Promise<void> {
  await RAPIER.init();
}

// Tuning constants

/**
 * Linear damping derived from `velocity *= FRICTION^dt`.
 * For FRICTION=0.8, damping ~= -ln(0.8) ~= 0.223.
 */
const LINEAR_DAMPING = -Math.log(0.8);

/**
 * Angular damping for the sword.
 * Derived from angularVelocity *= 0.6^dt -> damping ~= -ln(0.6) ~= 0.511.
 */
const SWORD_ANGULAR_DAMPING = -Math.log(0.6);

/**
 * Inertial multiplier applied as a force on the sword body
 * opposing the player's input acceleration. Kept low because the
 * revolute joint already provides some natural inertia.
 */
const SWORD_INERTIAL_MULTIPLIER = 1.0;

/** Restitution coefficient. Rapier caps at 1.0 (perfectly elastic). */
const RESTITUTION = 0.5;

/** Super-elastic coefficient used for flail chain bounce. */
const ELASTICITY = 1.0;

/** Half-thickness of boundary walls. */
const WALL_HALF_THICKNESS = 50;

/**
 * Player bodies use inflated mass so weapon joints don't drag them.
 * Input force scales with mass (F = m*a), so movement feel is unchanged.
 */
const PLAYER_MASS_SCALE = 20;

/** Converts Rapier contact-force magnitude into game damage (weapon -> body). */
const DAMAGE_WEAPON_SCALE = 0.00005;

/** Damage scale for body -> body collisions. Compensates for inflated player mass. */
const DAMAGE_BODY_SCALE = DAMAGE_WEAPON_SCALE / PLAYER_MASS_SCALE;

/** Extra knockback impulse applied to enemies on weapon hits, proportional to contact force. */
const HIT_KNOCKBACK_MULTIPLIER = 0.1;

/**
 * How much `controlReduction` the damaged player gains per point of damage.
 * With typical weapon hits of ~100-150 damage this gives 30-50% stagger.
 */
const STAGGER_PER_DAMAGE = 0.003;

/**
 * Player collision damage is scaled down by PLAYER_MASS_SCALE; scale stagger
 * back up so body-to-body hits still reduce control.
 */
const PLAYER_COLLISION_STAGGER_MULTIPLIER = PLAYER_MASS_SCALE;

/**
 * How fast `controlReduction` decays back to 0, in units per second.
 * 1.0 means a 50% stagger recovers in 0.5 s.
 */
const STAGGER_RECOVERY_RATE = 1.0;

// Collision groups (membership << 16 | filter)

const WALL_MEMBERSHIP = 0x0001;
const BODY_MEMBERSHIP = 0x0002;
const WEAPON_MEMBERSHIP = 0x0004;
const AURA_MEMBERSHIP = 0x0008;

function collisionGroup(membership: number, filter: number) {
  return (membership << 16) | filter;
}

const WALL_COLLISION_GROUP = collisionGroup(WALL_MEMBERSHIP, BODY_MEMBERSHIP | WEAPON_MEMBERSHIP);
const BODY_COLLISION_GROUP = collisionGroup(
  BODY_MEMBERSHIP,
  WALL_MEMBERSHIP | BODY_MEMBERSHIP | WEAPON_MEMBERSHIP | AURA_MEMBERSHIP,
);
const WEAPON_COLLISION_GROUP = collisionGroup(
  WEAPON_MEMBERSHIP,
  WALL_MEMBERSHIP | BODY_MEMBERSHIP | WEAPON_MEMBERSHIP,
);
const AURA_COLLISION_GROUP = collisionGroup(AURA_MEMBERSHIP, BODY_MEMBERSHIP | AURA_MEMBERSHIP);

// PhysicsWorld type

type ColliderMeta = { playerId: string; kind: "body" | "weapon" | "aura" };

type PlayerHandles = {
  bodyHandle: number;
  colliderHandle: number;
  weaponBodyHandle?: number;
  weaponColliderHandle?: number;
  jointHandle?: number;
  auraColliderHandle?: number;
};

export type PhysicsWorld = {
  world: RAPIER.World;
  handles: Record<string, PlayerHandles>;
  meta: Map<number, ColliderMeta>;
};

// Create / destroy world

export function createPhysicsWorld(room: Room): PhysicsWorld {
  const world = new RAPIER.World({ x: room.gravity.x, y: room.gravity.y });

  // Four boundary walls
  const width = room.size.x;
  const height = room.size.y;

  // Top
  addWall(
    world,
    width / 2,
    -WALL_HALF_THICKNESS / 2,
    width / 2 + WALL_HALF_THICKNESS,
    WALL_HALF_THICKNESS / 2,
  );
  // Bottom
  addWall(
    world,
    width / 2,
    height + WALL_HALF_THICKNESS / 2,
    width / 2 + WALL_HALF_THICKNESS,
    WALL_HALF_THICKNESS / 2,
  );
  // Left
  addWall(
    world,
    -WALL_HALF_THICKNESS / 2,
    height / 2,
    WALL_HALF_THICKNESS / 2,
    height / 2 + WALL_HALF_THICKNESS,
  );
  // Right
  addWall(
    world,
    width + WALL_HALF_THICKNESS / 2,
    height / 2,
    WALL_HALF_THICKNESS / 2,
    height / 2 + WALL_HALF_THICKNESS,
  );

  return { world, handles: {}, meta: new Map() };
}

function addWall(world: RAPIER.World, x: number, y: number, halfWidth: number, halfHeight: number) {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y));
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(halfWidth, halfHeight)
      .setRestitution(RESTITUTION)
      .setCollisionGroups(WALL_COLLISION_GROUP),
    body,
  );
}

export function destroyPhysicsWorld(physicsWorld: PhysicsWorld): void {
  physicsWorld.world.free();
}

// Add / remove player

export function addPlayer(physicsWorld: PhysicsWorld, player: Player): void {
  const { world } = physicsWorld;

  // Player body (no gravity, linear damping)
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(player.position.x, player.position.y)
      .setLinvel(player.velocity.x, player.velocity.y)
      .setGravityScale(0)
      .setLinearDamping(LINEAR_DAMPING)
      .setCcdEnabled(false),
  );

  const collider = world.createCollider(
    RAPIER.ColliderDesc.ball(player.radius)
      .setMass(player.weight * PLAYER_MASS_SCALE)
      .setRestitution(RESTITUTION)
      .setCollisionGroups(BODY_COLLISION_GROUP)
      .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
      .setActiveHooks(RAPIER.ActiveHooks.FILTER_CONTACT_PAIRS),
    body,
  );

  const playerHandles: PlayerHandles = {
    bodyHandle: body.handle,
    colliderHandle: collider.handle,
  };
  physicsWorld.meta.set(collider.handle, { playerId: player.id, kind: "body" });

  // Weapon
  match(player.weapon)
    .with({ type: "flail" }, (weapon) => {
      initFlail(physicsWorld, body, player.id, weapon, playerHandles);
    })
    .with({ type: "sword" }, (weapon) => {
      initSword(physicsWorld, body, player, weapon, playerHandles);
    })
    .with({ type: "aura" }, (weapon) => {
      initAura(physicsWorld, body, player, weapon, playerHandles);
    })
    .exhaustive();

  physicsWorld.handles[player.id] = playerHandles;
}

function initFlail(
  physicsWorld: PhysicsWorld,
  playerBody: RAPIER.RigidBody,
  playerId: string,
  weapon: FlailWeapon,
  playerHandles: PlayerHandles,
) {
  const { world } = physicsWorld;

  const flailBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(weapon.position.x, weapon.position.y)
      .setLinvel(weapon.velocity.x, weapon.velocity.y)
      .setLinearDamping(LINEAR_DAMPING)
      .setCcdEnabled(true),
  );

  const flailCollider = world.createCollider(
    RAPIER.ColliderDesc.ball(weapon.radius)
      .setMass(weapon.weight)
      .setRestitution(RESTITUTION)
      .setCollisionGroups(WEAPON_COLLISION_GROUP)
      .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
      .setActiveHooks(RAPIER.ActiveHooks.FILTER_CONTACT_PAIRS),
    flailBody,
  );

  // Rope joint: constrains max distance = chainLength
  const joint = world.createImpulseJoint(
    RAPIER.JointData.rope(weapon.chainLength, { x: 0, y: 0 }, { x: 0, y: 0 }),
    playerBody,
    flailBody,
    true,
  );
  joint.setContactsEnabled(false); // flail won't collide with own player

  playerHandles.weaponBodyHandle = flailBody.handle;
  playerHandles.weaponColliderHandle = flailCollider.handle;
  playerHandles.jointHandle = joint.handle;
  physicsWorld.meta.set(flailCollider.handle, { playerId, kind: "weapon" });
}

function initSword(
  physicsWorld: PhysicsWorld,
  playerBody: RAPIER.RigidBody,
  player: Player,
  weapon: SwordWeapon,
  playerHandles: PlayerHandles,
) {
  const { world } = physicsWorld;

  // Sword centre is at blade midpoint
  const centerX = player.position.x + Math.cos(weapon.angle) * (weapon.length / 2);
  const centerY = player.position.y + Math.sin(weapon.angle) * (weapon.length / 2);

  const swordBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(centerX, centerY)
      .setRotation(weapon.angle)
      .setAngvel(weapon.angularVelocity)
      .setGravityScale(1)
      .setAngularDamping(SWORD_ANGULAR_DAMPING)
      .setLinearDamping(0)
      .setCcdEnabled(true),
  );

  const swordCollider = world.createCollider(
    RAPIER.ColliderDesc.cuboid(weapon.length / 2, weapon.width / 2)
      .setMass(weapon.weight)
      .setRestitution(RESTITUTION)
      .setCollisionGroups(WEAPON_COLLISION_GROUP)
      .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS),
    swordBody,
  );

  // Revolute joint: pivot at player centre = base of sword
  const joint = world.createImpulseJoint(
    RAPIER.JointData.revolute({ x: 0, y: 0 }, { x: -weapon.length / 2, y: 0 }),
    playerBody,
    swordBody,
    true,
  );
  joint.setContactsEnabled(false); // sword won't collide with own player

  playerHandles.weaponBodyHandle = swordBody.handle;
  playerHandles.weaponColliderHandle = swordCollider.handle;
  playerHandles.jointHandle = joint.handle;
  physicsWorld.meta.set(swordCollider.handle, { playerId: player.id, kind: "weapon" });
}

function initAura(
  physicsWorld: PhysicsWorld,
  playerBody: RAPIER.RigidBody,
  player: Player,
  weapon: AuraWeapon,
  playerHandles: PlayerHandles,
) {
  const { world } = physicsWorld;

  // Second collider on the player body. Zero density so it doesn't add mass.
  const auraCollider = world.createCollider(
    RAPIER.ColliderDesc.ball(player.radius + weapon.radiusFromPlayer)
      .setDensity(0)
      .setRestitution(RESTITUTION)
      .setCollisionGroups(AURA_COLLISION_GROUP)
      .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
      .setActiveHooks(RAPIER.ActiveHooks.FILTER_CONTACT_PAIRS),
    playerBody,
  );

  playerHandles.auraColliderHandle = auraCollider.handle;
  physicsWorld.meta.set(auraCollider.handle, { playerId: player.id, kind: "aura" });
}

export function removePlayer(physicsWorld: PhysicsWorld, playerId: string): void {
  const playerHandles = physicsWorld.handles[playerId];
  if (!playerHandles) {
    return;
  }

  physicsWorld.meta.delete(playerHandles.colliderHandle);
  if (playerHandles.weaponColliderHandle !== undefined) {
    physicsWorld.meta.delete(playerHandles.weaponColliderHandle);
  }
  if (playerHandles.auraColliderHandle !== undefined) {
    physicsWorld.meta.delete(playerHandles.auraColliderHandle);
  }

  // Removing a rigid-body also removes its colliders and joints.
  if (playerHandles.weaponBodyHandle !== undefined) {
    physicsWorld.world.removeRigidBody(
      physicsWorld.world.getRigidBody(playerHandles.weaponBodyHandle),
    );
  }

  physicsWorld.world.removeRigidBody(physicsWorld.world.getRigidBody(playerHandles.bodyHandle));

  delete physicsWorld.handles[playerId];
}

// Physics step
export function stepPhysics(physicsWorld: PhysicsWorld, room: Room, elapsedTime: number): Damage[] {
  const { world } = physicsWorld;
  const damages: Damage[] = [];

  // 0. Decay hit-stagger each tick
  for (const player of Object.values(room.players)) {
    if (player.controlReduction > 0) {
      player.controlReduction = Math.max(
        0,
        player.controlReduction - STAGGER_RECOVERY_RATE * elapsedTime,
      );
    }
  }

  // 1. Apply forces (scaled by 1 - controlReduction)
  for (const player of Object.values(room.players)) {
    applyPlayerForces(physicsWorld, player);
  }

  // 2. Rapier step
  const eventQueue = new RAPIER.EventQueue(true);
  world.timestep = elapsedTime;

  // Physics hooks: filter self-collisions (same player's body <-> weapon)
  const hooks: RAPIER.PhysicsHooks = {
    filterContactPair(collider1, collider2) {
      const meta1 = physicsWorld.meta.get(collider1);
      const meta2 = physicsWorld.meta.get(collider2);
      if (meta1 && meta2 && meta1.playerId === meta2.playerId) {
        return null;
      }
      return RAPIER.SolverFlags.COMPUTE_IMPULSE;
    },
    filterIntersectionPair(collider1, collider2) {
      const meta1 = physicsWorld.meta.get(collider1);
      const meta2 = physicsWorld.meta.get(collider2);
      if (meta1 && meta2 && meta1.playerId === meta2.playerId) {
        return false;
      }
      return true;
    },
  };
  world.step(eventQueue, hooks);

  // 3. Flail chain bounce (super-elastic, operates on Rapier bodies)
  for (const player of Object.values(room.players)) {
    if (player.weapon.type === "flail") {
      applyFlailChainBounce(physicsWorld, player.id, player.weapon);
    }
  }

  // 4. Clamp velocities on Rapier bodies
  for (const player of Object.values(room.players)) {
    clampVelocities(physicsWorld, player, room);
  }

  // 5. Contact force events -> damage + stagger
  eventQueue.drainContactForceEvents((event) => {
    processContactDamage(physicsWorld, room, event, damages);
  });

  // Apply stagger from the damage dealt this tick
  for (const damage of damages) {
    const damagedPlayer = room.players[damage.damagedPlayerId];
    if (!damagedPlayer) {
      continue;
    }

    if (damage.type === "playerCollision" && damagedPlayer.weapon.type === "aura") {
      continue;
    }

    const staggerMultiplier =
      damage.type === "playerCollision" ? PLAYER_COLLISION_STAGGER_MULTIPLIER : 1;

    damagedPlayer.controlReduction = Math.min(
      1,
      damagedPlayer.controlReduction + damage.amount * STAGGER_PER_DAMAGE * staggerMultiplier,
    );
  }

  // 6. Read final Rapier state into Room
  for (const player of Object.values(room.players)) {
    readBackState(physicsWorld, player);
  }

  eventQueue.free();
  return damages;
}

// Step helpers

function applyPlayerForces(physicsWorld: PhysicsWorld, player: Player) {
  const playerHandles = physicsWorld.handles[player.id];
  if (!playerHandles) {
    return;
  }
  const body = physicsWorld.world.getRigidBody(playerHandles.bodyHandle);

  // Scale input by how much control the player has after being hit
  const control = 1 - player.controlReduction;

  // Log-scaled acceleration
  const accelerationX =
    player.acceleration.x *
    control *
    Math.log2(Math.max(2, Math.abs(player.acceleration.x - player.velocity.x) / 2));
  const accelerationY =
    player.acceleration.y *
    control *
    Math.log2(Math.max(2, Math.abs(player.acceleration.y - player.velocity.y) / 2));

  const mass = body.mass();
  body.resetForces(true);
  body.addForce({ x: accelerationX * mass, y: accelerationY * mass }, true);

  // Sword: inertial force makes it trail behind when the player accelerates
  if (player.weapon.type === "sword" && playerHandles.weaponBodyHandle !== undefined) {
    const swordBody = physicsWorld.world.getRigidBody(playerHandles.weaponBodyHandle);
    const swordMass = swordBody.mass();
    swordBody.resetForces(true);
    swordBody.addForce(
      {
        x: -player.acceleration.x * swordMass * SWORD_INERTIAL_MULTIPLIER,
        y: -player.acceleration.y * swordMass * SWORD_INERTIAL_MULTIPLIER,
      },
      true,
    );
  }
}

function clampVelocities(physicsWorld: PhysicsWorld, player: Player, room: Room) {
  const playerHandles = physicsWorld.handles[player.id];
  if (!playerHandles) {
    return;
  }

  // Clamp player speed
  const body = physicsWorld.world.getRigidBody(playerHandles.bodyHandle);
  const velocity = body.linvel();
  const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
  if (speed > room.maxPlayerSpeed) {
    const scale = room.maxPlayerSpeed / speed;
    body.setLinvel({ x: velocity.x * scale, y: velocity.y * scale }, true);
  }

  if (playerHandles.weaponBodyHandle === undefined) {
    return;
  }
  const weaponBody = physicsWorld.world.getRigidBody(playerHandles.weaponBodyHandle);

  match(player.weapon)
    .with({ type: "flail" }, (weapon) => {
      const weaponVelocity = weaponBody.linvel();
      const weaponSpeed = Math.sqrt(
        weaponVelocity.x * weaponVelocity.x + weaponVelocity.y * weaponVelocity.y,
      );
      if (weaponSpeed > weapon.maxSpeed) {
        const ratio = weapon.maxSpeed / weaponSpeed;
        weaponBody.setLinvel({ x: weaponVelocity.x * ratio, y: weaponVelocity.y * ratio }, true);
      }
    })
    .with({ type: "sword" }, (weapon) => {
      const angularVelocity = weaponBody.angvel();
      if (Math.abs(angularVelocity) > weapon.maxAngularSpeed) {
        weaponBody.setAngvel(Math.sign(angularVelocity) * weapon.maxAngularSpeed, true);
      }
    })
    .with({ type: "aura" }, () => {})
    .exhaustive();
}

/** Pure copy of Rapier state into Room objects. No clamping or modifications. */
function readBackState(physicsWorld: PhysicsWorld, player: Player) {
  const playerHandles = physicsWorld.handles[player.id];
  if (!playerHandles) {
    return;
  }

  const body = physicsWorld.world.getRigidBody(playerHandles.bodyHandle);
  const position = body.translation();
  const velocity = body.linvel();
  player.position = { x: position.x, y: position.y };
  player.velocity = { x: velocity.x, y: velocity.y };

  if (playerHandles.weaponBodyHandle === undefined) {
    return;
  }
  const weaponBody = physicsWorld.world.getRigidBody(playerHandles.weaponBodyHandle);

  match(player.weapon)
    .with({ type: "flail" }, (weapon) => {
      const weaponPosition = weaponBody.translation();
      const weaponVelocity = weaponBody.linvel();
      weapon.position = { x: weaponPosition.x, y: weaponPosition.y };
      weapon.velocity = { x: weaponVelocity.x, y: weaponVelocity.y };
    })
    .with({ type: "sword" }, (weapon) => {
      weapon.angle = weaponBody.rotation();
      weapon.angularVelocity = weaponBody.angvel();
    })
    .with({ type: "aura" }, () => {})
    .exhaustive();
}

/** Applies a super-elastic bounce when the flail chain goes taut. */
function applyFlailChainBounce(physicsWorld: PhysicsWorld, playerId: string, weapon: FlailWeapon) {
  const playerHandles = physicsWorld.handles[playerId];
  if (!playerHandles || playerHandles.weaponBodyHandle === undefined) {
    return;
  }

  const playerBody = physicsWorld.world.getRigidBody(playerHandles.bodyHandle);
  const weaponBody = physicsWorld.world.getRigidBody(playerHandles.weaponBodyHandle);

  const playerPosition = playerBody.translation();
  const weaponPosition = weaponBody.translation();

  const deltaX = playerPosition.x - weaponPosition.x;
  const deltaY = playerPosition.y - weaponPosition.y;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  if (distance < weapon.chainLength * 0.98) {
    return;
  }

  const normalX = distance > 0 ? deltaX / distance : 0;
  const normalY = distance > 0 ? deltaY / distance : 0;

  const playerVelocity = playerBody.linvel();
  const weaponVelocity = weaponBody.linvel();

  const relativeVelocityX = playerVelocity.x - weaponVelocity.x;
  const relativeVelocityY = playerVelocity.y - weaponVelocity.y;
  const relativeVelocityAlongChain = relativeVelocityX * normalX + relativeVelocityY * normalY;

  if (relativeVelocityAlongChain >= 0) {
    return;
  }

  const bounce = Math.abs(relativeVelocityAlongChain) * (ELASTICITY - 1.0);
  weaponBody.setLinvel(
    {
      x: weaponVelocity.x + normalX * bounce,
      y: weaponVelocity.y + normalY * bounce,
    },
    true,
  );
}

function processContactDamage(
  physicsWorld: PhysicsWorld,
  room: Room,
  event: RAPIER.TempContactForceEvent,
  damages: Damage[],
) {
  const meta1 = physicsWorld.meta.get(event.collider1());
  const meta2 = physicsWorld.meta.get(event.collider2());
  if (!meta1 || !meta2) {
    return;
  } // wall involved
  if (meta1.playerId === meta2.playerId) {
    return;
  } // self (shouldn't happen)

  const forceMagnitude = event.totalForceMagnitude();

  // weapon -> enemy body
  if (meta1.kind === "weapon" && meta2.kind === "body") {
    damages.push({
      type: "weaponCollision",
      playerId: meta1.playerId,
      damagedPlayerId: meta2.playerId,
      amount: forceMagnitude * DAMAGE_WEAPON_SCALE,
    });
    applyHitKnockback(physicsWorld, room, meta1.playerId, meta2.playerId, forceMagnitude);
  } else if (meta2.kind === "weapon" && meta1.kind === "body") {
    damages.push({
      type: "weaponCollision",
      playerId: meta2.playerId,
      damagedPlayerId: meta1.playerId,
      amount: forceMagnitude * DAMAGE_WEAPON_SCALE,
    });
    applyHitKnockback(physicsWorld, room, meta2.playerId, meta1.playerId, forceMagnitude);
  }
  // aura -> enemy body
  else if (meta1.kind === "aura" && meta2.kind === "body") {
    const auraPlayer = room.players[meta1.playerId];
    if (!auraPlayer || auraPlayer.weapon.type !== "aura") {
      return;
    }
    damages.push({
      type: "weaponCollision",
      playerId: meta1.playerId,
      damagedPlayerId: meta2.playerId,
      amount: forceMagnitude * DAMAGE_WEAPON_SCALE * auraPlayer.weapon.damageMultiplier,
    });
    applyHitKnockback(physicsWorld, room, meta1.playerId, meta2.playerId, forceMagnitude);
  } else if (meta2.kind === "aura" && meta1.kind === "body") {
    const auraPlayer = room.players[meta2.playerId];
    if (!auraPlayer || auraPlayer.weapon.type !== "aura") {
      return;
    }
    damages.push({
      type: "weaponCollision",
      playerId: meta2.playerId,
      damagedPlayerId: meta1.playerId,
      amount: forceMagnitude * DAMAGE_WEAPON_SCALE * auraPlayer.weapon.damageMultiplier,
    });
    applyHitKnockback(physicsWorld, room, meta2.playerId, meta1.playerId, forceMagnitude);
  }
  // aura <-> aura: both players take damage
  else if (meta1.kind === "aura" && meta2.kind === "aura") {
    const player1 = room.players[meta1.playerId];
    const player2 = room.players[meta2.playerId];
    if (!player1 || !player2) {
      return;
    }
    if (player1.weapon.type !== "aura" || player2.weapon.type !== "aura") {
      return;
    }
    damages.push({
      type: "weaponCollision",
      playerId: player2.id,
      damagedPlayerId: player1.id,
      amount: forceMagnitude * DAMAGE_WEAPON_SCALE * player2.weapon.damageMultiplier,
    });
    damages.push({
      type: "weaponCollision",
      playerId: player1.id,
      damagedPlayerId: player2.id,
      amount: forceMagnitude * DAMAGE_WEAPON_SCALE * player1.weapon.damageMultiplier,
    });
  }
  // body -> body
  else if (meta1.kind === "body" && meta2.kind === "body") {
    const player1 = room.players[meta1.playerId];
    const player2 = room.players[meta2.playerId];
    if (!player1 || !player2) {
      return;
    }
    const totalWeight = player1.weight + player2.weight;
    damages.push({
      type: "playerCollision",
      playerId: player2.id,
      damagedPlayerId: player1.id,
      amount: (forceMagnitude * DAMAGE_BODY_SCALE * player2.weight) / totalWeight,
    });
    damages.push({
      type: "playerCollision",
      playerId: player1.id,
      damagedPlayerId: player2.id,
      amount: (forceMagnitude * DAMAGE_BODY_SCALE * player1.weight) / totalWeight,
    });
  }
}

/** Applies extra knockback impulse to the enemy, directed away from the weapon. */
function applyHitKnockback(
  physicsWorld: PhysicsWorld,
  room: Room,
  attackerId: string,
  enemyId: string,
  forceMagnitude: number,
) {
  const attackerHandles = physicsWorld.handles[attackerId];
  const enemyHandles = physicsWorld.handles[enemyId];
  if (!attackerHandles || !enemyHandles) {
    return;
  }

  // Use the weapon body position if available, fall back to player body
  const sourceHandle = attackerHandles.weaponBodyHandle ?? attackerHandles.bodyHandle;
  const sourceBody = physicsWorld.world.getRigidBody(sourceHandle);
  const enemyBody = physicsWorld.world.getRigidBody(enemyHandles.bodyHandle);

  const sourcePosition = sourceBody.translation();
  const enemyPosition = enemyBody.translation();

  const deltaX = enemyPosition.x - sourcePosition.x;
  const deltaY = enemyPosition.y - sourcePosition.y;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  if (distance === 0) {
    return;
  }

  const normalX = deltaX / distance;
  const normalY = deltaY / distance;
  const impulse = forceMagnitude * HIT_KNOCKBACK_MULTIPLIER;

  // Apply to Rapier body (takes effect next step)
  enemyBody.applyImpulse({ x: normalX * impulse, y: normalY * impulse }, true);

  // Also update Room state so the knockback is broadcast this tick
  const enemy = room.players[enemyId];
  if (enemy) {
    const enemyMass = enemyBody.mass();
    enemy.velocity.x += (normalX * impulse) / enemyMass;
    enemy.velocity.y += (normalY * impulse) / enemyMass;
  }
}
