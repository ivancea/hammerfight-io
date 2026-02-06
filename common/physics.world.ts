import RAPIER from "@dimforge/rapier2d-compat";
import { match } from "ts-pattern";
import { Damage } from "./damage";
import { Player } from "./types/player";
import { Room } from "./types/room";
import type { FlailWeapon, SwordWeapon } from "./types/weapon";

// ─────────────────────────────────────────────────────────────────────
// Rapier initialisation
// ─────────────────────────────────────────────────────────────────────

export async function initRapier(): Promise<void> {
  await RAPIER.init();
}

// ─────────────────────────────────────────────────────────────────────
// Tuning constants
// ─────────────────────────────────────────────────────────────────────

/**
 * Linear damping matching the old `velocity *= FRICTION^dt` model.
 * For FRICTION=0.8, damping ≈ -ln(0.8) ≈ 0.223.
 */
const LINEAR_DAMPING = -Math.log(0.8);

/**
 * Angular damping for the sword.
 * Old code: angularVelocity *= 0.6^dt → damping ≈ -ln(0.6) ≈ 0.511.
 */
const SWORD_ANGULAR_DAMPING = -Math.log(0.6);

/**
 * Inertial multiplier applied as a force on the sword body
 * opposing the player's input acceleration. Lower than the old 1.5
 * because the revolute joint already provides some natural inertia.
 */
const SWORD_INERTIAL_MULTIPLIER = 1.0;

/** Restitution coefficient. Old game was super-elastic (1.5); Rapier caps at 1.0. */
const RESTITUTION = 1.0;

/** Old ELASTICITY used for flail chain bounce and aura push. */
const ELASTICITY = 1.5;

/** Half-thickness of boundary walls. */
const WALL_HALF_THICKNESS = 50;

/**
 * Player bodies use a much higher mass in Rapier so that weapon joints
 * (sword revolute, flail rope) don't drag the player around.
 * Because F = m·a, the input force scales with mass and the player's
 * movement feel is unchanged.  Damping is mass-independent too.
 */
const PLAYER_MASS_SCALE = 20;

/** Converts Rapier contact-force magnitude into game damage (weapon→body). */
const DAMAGE_WEAPON_SCALE = 0.00005;

/**
 * Damage scale for body→body collisions.
 * Divided by PLAYER_MASS_SCALE because the inflated masses produce
 * proportionally larger contact forces for the same relative velocity.
 */
const DAMAGE_BODY_SCALE = DAMAGE_WEAPON_SCALE / PLAYER_MASS_SCALE;

/**
 * Extra impulse multiplier applied to the enemy body on weapon hits.
 * Because PLAYER_MASS_SCALE inflates player mass, weapon collisions
 * barely push enemies, making hits feel weightless.  This adds an
 * extra knockback impulse proportional to the Rapier contact force
 * so hits look and feel impactful.
 */
const HIT_KNOCKBACK_MULTIPLIER = 0.1;

/**
 * How much `controlReduction` the damaged player gains per point of damage.
 * With typical weapon hits of ~100–150 damage this gives 30–50% stagger.
 */
const STAGGER_PER_DAMAGE = 0.003;

/**
 * How fast `controlReduction` decays back to 0, in units per second.
 * 1.0 means a 50% stagger recovers in 0.5 s.
 */
const STAGGER_RECOVERY_RATE = 1.0;

// ─────────────────────────────────────────────────────────────────────
// Collision groups  (membership << 16 | filter)
// ─────────────────────────────────────────────────────────────────────

const WALL_MEMBERSHIP = 0x0001;
const BODY_MEMBERSHIP = 0x0002;
const WEAPON_MEMBERSHIP = 0x0004;

function collisionGroup(membership: number, filter: number) {
  return (membership << 16) | filter;
}

const WALL_COLLISION_GROUP = collisionGroup(WALL_MEMBERSHIP, BODY_MEMBERSHIP | WEAPON_MEMBERSHIP);
const BODY_COLLISION_GROUP = collisionGroup(
  BODY_MEMBERSHIP,
  WALL_MEMBERSHIP | BODY_MEMBERSHIP | WEAPON_MEMBERSHIP,
);
const WEAPON_COLLISION_GROUP = collisionGroup(
  WEAPON_MEMBERSHIP,
  WALL_MEMBERSHIP | BODY_MEMBERSHIP | WEAPON_MEMBERSHIP,
);

// ─────────────────────────────────────────────────────────────────────
// PhysicsWorld type
// ─────────────────────────────────────────────────────────────────────

type ColliderMeta = { playerId: string; kind: "body" | "weapon" };

type PlayerHandles = {
  bodyHandle: number;
  colliderHandle: number;
  weaponBodyHandle?: number;
  weaponColliderHandle?: number;
  jointHandle?: number;
};

export type PhysicsWorld = {
  world: RAPIER.World;
  handles: Record<string, PlayerHandles>;
  meta: Map<number, ColliderMeta>;
};

// ─────────────────────────────────────────────────────────────────────
// Create / destroy world
// ─────────────────────────────────────────────────────────────────────

export function createPhysicsWorld(room: Room): PhysicsWorld {
  const world = new RAPIER.World({ x: room.gravity.x, y: room.gravity.y });

  // Four boundary walls
  const width = room.size.x;
  const height = room.size.y;
  addWall(
    world,
    width / 2,
    -WALL_HALF_THICKNESS / 2,
    width / 2 + WALL_HALF_THICKNESS,
    WALL_HALF_THICKNESS / 2,
  ); // top
  addWall(
    world,
    width / 2,
    height + WALL_HALF_THICKNESS / 2,
    width / 2 + WALL_HALF_THICKNESS,
    WALL_HALF_THICKNESS / 2,
  ); // bottom
  addWall(
    world,
    -WALL_HALF_THICKNESS / 2,
    height / 2,
    WALL_HALF_THICKNESS / 2,
    height / 2 + WALL_HALF_THICKNESS,
  ); // left
  addWall(
    world,
    width + WALL_HALF_THICKNESS / 2,
    height / 2,
    WALL_HALF_THICKNESS / 2,
    height / 2 + WALL_HALF_THICKNESS,
  ); // right

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

// ─────────────────────────────────────────────────────────────────────
// Add / remove player
// ─────────────────────────────────────────────────────────────────────

export function addPlayer(physicsWorld: PhysicsWorld, player: Player): void {
  const { world } = physicsWorld;

  // ── Player body (no gravity, linear damping) ──────────────────
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

  // ── Weapon ────────────────────────────────────────────────────
  match(player.weapon)
    .with({ type: "flail" }, (weapon) => {
      initFlail(physicsWorld, body, player.id, weapon, playerHandles);
    })
    .with({ type: "sword" }, (weapon) => {
      initSword(physicsWorld, body, player, weapon, playerHandles);
    })
    .with({ type: "aura" }, () => {
      /* handled manually each tick */
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

export function removePlayer(physicsWorld: PhysicsWorld, playerId: string): void {
  const playerHandles = physicsWorld.handles[playerId];
  if (!playerHandles) return;

  physicsWorld.meta.delete(playerHandles.colliderHandle);
  if (playerHandles.weaponColliderHandle !== undefined)
    physicsWorld.meta.delete(playerHandles.weaponColliderHandle);

  // Removing a rigid-body also removes its colliders and joints.
  if (playerHandles.weaponBodyHandle !== undefined) {
    physicsWorld.world.removeRigidBody(
      physicsWorld.world.getRigidBody(playerHandles.weaponBodyHandle),
    );
  }

  physicsWorld.world.removeRigidBody(physicsWorld.world.getRigidBody(playerHandles.bodyHandle));

  delete physicsWorld.handles[playerId];
}

// ─────────────────────────────────────────────────────────────────────
// Physics step
// ─────────────────────────────────────────────────────────────────────

export function stepPhysics(physicsWorld: PhysicsWorld, room: Room, elapsedTime: number): Damage[] {
  const { world } = physicsWorld;
  const damages: Damage[] = [];

  // ── 0. Decay hit-stagger each tick ─────────────────────────────
  for (const player of Object.values(room.players)) {
    if (player.controlReduction > 0) {
      player.controlReduction = Math.max(
        0,
        player.controlReduction - STAGGER_RECOVERY_RATE * elapsedTime,
      );
    }
  }

  // ── 1. Apply forces (scaled by 1 − controlReduction) ──────────
  for (const player of Object.values(room.players)) {
    applyPlayerForces(physicsWorld, player);
  }

  // ── 2. Rapier step ──────────────────────────────────────────────
  const eventQueue = new RAPIER.EventQueue(true);
  world.timestep = elapsedTime;

  // Physics hooks: filter self-collisions (same player's body↔weapon)
  const hooks: RAPIER.PhysicsHooks = {
    filterContactPair(collider1, collider2) {
      const meta1 = physicsWorld.meta.get(collider1);
      const meta2 = physicsWorld.meta.get(collider2);
      if (meta1 && meta2 && meta1.playerId === meta2.playerId) return null;
      return RAPIER.SolverFlags.COMPUTE_IMPULSE;
    },
    filterIntersectionPair(collider1, collider2) {
      const meta1 = physicsWorld.meta.get(collider1);
      const meta2 = physicsWorld.meta.get(collider2);
      if (meta1 && meta2 && meta1.playerId === meta2.playerId) return false;
      return true;
    },
  };
  world.step(eventQueue, hooks);

  // ── 3. Read back into Room state ────────────────────────────────
  for (const player of Object.values(room.players)) {
    readBackState(physicsWorld, player, room);
  }

  // ── 4. Flail chain bounce (manual, preserves old super-elastic feel)
  for (const player of Object.values(room.players)) {
    if (player.weapon.type === "flail") {
      applyFlailChainBounce(physicsWorld, player, player.weapon);
    }
  }

  // ── 5. Contact force events → damage + stagger ─────────────────
  eventQueue.drainContactForceEvents((event) => {
    processContactDamage(physicsWorld, room, event, damages);
  });

  // Apply stagger from the damage dealt this tick
  for (const damage of damages) {
    const damagedPlayer = room.players[damage.damagedPlayerId];
    if (damagedPlayer) {
      damagedPlayer.controlReduction = Math.min(
        1,
        damagedPlayer.controlReduction + damage.amount * STAGGER_PER_DAMAGE,
      );
    }
  }

  // ── 6. Aura effects (manual) ────────────────────────────────────
  applyAuraEffects(physicsWorld, room, elapsedTime, damages);

  eventQueue.free();
  return damages;
}

// ─────────────────────────────────────────────────────────────────────
// Step helpers
// ─────────────────────────────────────────────────────────────────────

function applyPlayerForces(physicsWorld: PhysicsWorld, player: Player) {
  const playerHandles = physicsWorld.handles[player.id];
  if (!playerHandles) return;
  const body = physicsWorld.world.getRigidBody(playerHandles.bodyHandle);

  // Scale input by how much control the player has after being hit
  const control = 1 - player.controlReduction;

  // Log-scaled acceleration (original game feel)
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

  // Sword: inertial pseudo-force opposing the player's input acceleration.
  // This makes the sword trail behind when the player accelerates.
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

function readBackState(physicsWorld: PhysicsWorld, player: Player, room: Room) {
  const playerHandles = physicsWorld.handles[player.id];
  if (!playerHandles) return;
  const body = physicsWorld.world.getRigidBody(playerHandles.bodyHandle);

  const position = body.translation();
  const velocity = body.linvel();
  player.position = { x: position.x, y: position.y };
  player.velocity = { x: velocity.x, y: velocity.y };

  // Clamp player speed
  const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
  if (speed > room.maxPlayerSpeed) {
    const scale = room.maxPlayerSpeed / speed;
    player.velocity = { x: velocity.x * scale, y: velocity.y * scale };
    body.setLinvel(player.velocity, true);
  }

  match(player.weapon)
    .with({ type: "flail" }, (weapon) => {
      if (playerHandles.weaponBodyHandle === undefined) return;
      const weaponBody = physicsWorld.world.getRigidBody(playerHandles.weaponBodyHandle);
      const weaponPosition = weaponBody.translation();
      const weaponVelocity = weaponBody.linvel();
      weapon.position = { x: weaponPosition.x, y: weaponPosition.y };
      weapon.velocity = { x: weaponVelocity.x, y: weaponVelocity.y };

      // Clamp flail speed
      const weaponSpeed = Math.sqrt(
        weaponVelocity.x * weaponVelocity.x + weaponVelocity.y * weaponVelocity.y,
      );
      if (weaponSpeed > weapon.maxSpeed) {
        const ratio = weapon.maxSpeed / weaponSpeed;
        weapon.velocity = { x: weaponVelocity.x * ratio, y: weaponVelocity.y * ratio };
        weaponBody.setLinvel(weapon.velocity, true);
      }
    })
    .with({ type: "sword" }, (weapon) => {
      if (playerHandles.weaponBodyHandle === undefined) return;
      const weaponBody = physicsWorld.world.getRigidBody(playerHandles.weaponBodyHandle);
      weapon.angle = weaponBody.rotation();
      weapon.angularVelocity = weaponBody.angvel();

      // Clamp angular speed
      if (Math.abs(weapon.angularVelocity) > weapon.maxAngularSpeed) {
        weapon.angularVelocity = Math.sign(weapon.angularVelocity) * weapon.maxAngularSpeed;
        weaponBody.setAngvel(weapon.angularVelocity, true);
      }
    })
    .with({ type: "aura" }, () => {})
    .exhaustive();
}

/**
 * The rope joint constrains max distance, but the old code added a
 * super-elastic bounce when the chain went taut.  After Rapier steps,
 * check if the chain is at max length and apply the extra velocity.
 */
function applyFlailChainBounce(physicsWorld: PhysicsWorld, player: Player, weapon: FlailWeapon) {
  const deltaX = player.position.x - weapon.position.x;
  const deltaY = player.position.y - weapon.position.y;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  // Only apply bounce when the chain is taut (distance at or beyond chain length)
  if (distance < weapon.chainLength * 0.98) return;

  const normalX = distance > 0 ? deltaX / distance : 0;
  const normalY = distance > 0 ? deltaY / distance : 0;

  // Relative velocity along the chain (positive = moving apart)
  const relativeVelocityX = player.velocity.x - weapon.velocity.x;
  const relativeVelocityY = player.velocity.y - weapon.velocity.y;
  const relativeVelocityAlongChain = relativeVelocityX * normalX + relativeVelocityY * normalY;

  // Only bounce if the flail is pulling away from the player
  if (relativeVelocityAlongChain >= 0) return;

  // Add bounce velocity towards the player (old ELASTICITY scaling)
  const bounce = Math.abs(relativeVelocityAlongChain) * (ELASTICITY - 1.0);
  weapon.velocity.x += normalX * bounce;
  weapon.velocity.y += normalY * bounce;

  // Sync back to Rapier
  const playerHandles = physicsWorld.handles[player.id];
  if (!playerHandles || playerHandles.weaponBodyHandle === undefined) return;
  physicsWorld.world
    .getRigidBody(playerHandles.weaponBodyHandle)
    .setLinvel({ x: weapon.velocity.x, y: weapon.velocity.y }, true);
}

function processContactDamage(
  physicsWorld: PhysicsWorld,
  room: Room,
  event: RAPIER.TempContactForceEvent,
  damages: Damage[],
) {
  const meta1 = physicsWorld.meta.get(event.collider1());
  const meta2 = physicsWorld.meta.get(event.collider2());
  if (!meta1 || !meta2) return; // wall involved
  if (meta1.playerId === meta2.playerId) return; // self (shouldn't happen)

  const forceMagnitude = event.totalForceMagnitude();

  // weapon → enemy body
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
  // body → body (use DAMAGE_BODY_SCALE to compensate for inflated player mass)
  else if (meta1.kind === "body" && meta2.kind === "body") {
    const player1 = room.players[meta1.playerId];
    const player2 = room.players[meta2.playerId];
    if (!player1 || !player2) return;
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
  // weapon ↔ weapon: physics only, no damage
}

/**
 * Applies an extra knockback impulse to the enemy body when hit by a weapon.
 * Direction: from the weapon towards the enemy.
 * Magnitude: proportional to the Rapier contact force × HIT_KNOCKBACK_MULTIPLIER.
 *
 * Also updates the Room player velocity so the knockback is visible
 * in the same tick's network broadcast.
 */
function applyHitKnockback(
  physicsWorld: PhysicsWorld,
  room: Room,
  attackerId: string,
  enemyId: string,
  forceMagnitude: number,
) {
  const attackerHandles = physicsWorld.handles[attackerId];
  const enemyHandles = physicsWorld.handles[enemyId];
  if (!attackerHandles || !enemyHandles) return;

  // Use the weapon body position if available, fall back to player body
  const sourceHandle = attackerHandles.weaponBodyHandle ?? attackerHandles.bodyHandle;
  const sourceBody = physicsWorld.world.getRigidBody(sourceHandle);
  const enemyBody = physicsWorld.world.getRigidBody(enemyHandles.bodyHandle);

  const sourcePosition = sourceBody.translation();
  const enemyPosition = enemyBody.translation();

  const deltaX = enemyPosition.x - sourcePosition.x;
  const deltaY = enemyPosition.y - sourcePosition.y;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  if (distance === 0) return;

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

// ─────────────────────────────────────────────────────────────────────
// Aura (manual – no Rapier representation)
// ─────────────────────────────────────────────────────────────────────

/**
 * Replicates the old aura weapon behaviour: enlarged circle collision
 * check that pushes entities apart and deals damage.
 */
function applyAuraEffects(
  physicsWorld: PhysicsWorld,
  room: Room,
  elapsedTime: number,
  damages: Damage[],
) {
  for (const player of Object.values(room.players)) {
    if (player.weapon.type !== "aura") continue;
    const weapon = player.weapon;

    for (const other of Object.values(room.players)) {
      if (player.id === other.id) continue;

      const deltaX = other.position.x - player.position.x;
      const deltaY = other.position.y - player.position.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const minDistance = player.radius + weapon.radiusFromPlayer + other.radius;

      if (distance >= minDistance) continue;

      const overlap = minDistance - distance;
      const normalX = distance > 0 ? deltaX / distance : 1;
      const normalY = distance > 0 ? deltaY / distance : 0;

      const push = overlap * 2; // old code pushes both sides by 2× overlap
      const effectiveWeight = player.weight * weapon.playerCollisionWeightMultiplier;
      const totalWeight = effectiveWeight + other.weight;

      // Push apart (replicating handleRawCirclesCollision)
      other.position.x += normalX * push;
      other.position.y += normalY * push;
      other.velocity.x +=
        (normalX * push * ELASTICITY * (effectiveWeight / totalWeight)) / elapsedTime;
      other.velocity.y +=
        (normalY * push * ELASTICITY * (effectiveWeight / totalWeight)) / elapsedTime;

      player.position.x -= normalX * push;
      player.position.y -= normalY * push;
      player.velocity.x -=
        (normalX * push * ELASTICITY * (other.weight / totalWeight)) / elapsedTime;
      player.velocity.y -=
        (normalY * push * ELASTICITY * (other.weight / totalWeight)) / elapsedTime;

      // Sync modified positions back to Rapier
      syncBodyToRapier(physicsWorld, player);
      syncBodyToRapier(physicsWorld, other);

      const damage =
        (overlap * (effectiveWeight / totalWeight) * weapon.damageMultiplier) / elapsedTime;
      if (damage > 0) {
        damages.push({
          type: "weaponCollision",
          damagedPlayerId: other.id,
          playerId: player.id,
          amount: damage,
        });
      }

      // Aura vs aura
      if (other.weapon.type === "aura") {
        const otherWeapon = other.weapon;
        const auraDistance =
          player.radius + weapon.radiusFromPlayer + other.radius + otherWeapon.radiusFromPlayer;

        if (distance < auraDistance) {
          const auraOverlap = auraDistance - distance;
          const otherEffectiveWeight = other.weight * otherWeapon.playerCollisionWeightMultiplier;
          const auraTotalWeight = effectiveWeight + otherEffectiveWeight;

          const playerDamage =
            (auraOverlap * (otherEffectiveWeight / auraTotalWeight)) / elapsedTime;
          const otherDamage = (auraOverlap * (effectiveWeight / auraTotalWeight)) / elapsedTime;

          if (playerDamage > 0) {
            damages.push({
              type: "weaponCollision",
              damagedPlayerId: player.id,
              playerId: other.id,
              amount: playerDamage,
            });
          }
          if (otherDamage > 0) {
            damages.push({
              type: "weaponCollision",
              damagedPlayerId: other.id,
              playerId: player.id,
              amount: otherDamage,
            });
          }
        }
      }
    }
  }
}

function syncBodyToRapier(physicsWorld: PhysicsWorld, player: Player) {
  const playerHandles = physicsWorld.handles[player.id];
  if (!playerHandles) return;
  const body = physicsWorld.world.getRigidBody(playerHandles.bodyHandle);
  body.setTranslation({ x: player.position.x, y: player.position.y }, true);
  body.setLinvel({ x: player.velocity.x, y: player.velocity.y }, true);
}
