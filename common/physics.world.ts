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
const SWORD_ANG_DAMPING = -Math.log(0.6);

/**
 * Inertial multiplier applied as a force on the sword body
 * opposing the player's input acceleration. Lower than the old 1.5
 * because the revolute joint already provides some natural inertia.
 */
const SWORD_INERTIAL_MULT = 1.0;

/** Restitution coefficient. Old game was super-elastic (1.5); Rapier caps at 1.0. */
const RESTITUTION = 1.0;

/** Old ELASTICITY used for flail chain bounce and aura push. */
const ELASTICITY = 1.5;

/** Half-thickness of boundary walls. */
const WALL_HT = 50;

/**
 * Player bodies use a much higher mass in Rapier so that weapon joints
 * (sword revolute, flail rope) don't drag the player around.
 * Because F = m·a, the input force scales with mass and the player's
 * movement feel is unchanged.  Damping is mass-independent too.
 */
const PLAYER_MASS_SCALE = 20;

/** Converts Rapier contact-force magnitude into game damage (weapon→body). */
const DMG_WEAPON_SCALE = 0.00005;

/**
 * Damage scale for body→body collisions.
 * Divided by PLAYER_MASS_SCALE because the inflated masses produce
 * proportionally larger contact forces for the same relative velocity.
 */
const DMG_BODY_SCALE = DMG_WEAPON_SCALE / PLAYER_MASS_SCALE;

/**
 * Extra impulse multiplier applied to the enemy body on weapon hits.
 * Because PLAYER_MASS_SCALE inflates player mass, weapon collisions
 * barely push enemies, making hits feel weightless.  This adds an
 * extra knockback impulse proportional to the Rapier contact force
 * so hits look and feel impactful.
 */
const HIT_KNOCKBACK_MULT = 0.25;

// ─────────────────────────────────────────────────────────────────────
// Collision groups  (membership << 16 | filter)
// ─────────────────────────────────────────────────────────────────────

const WALL_M = 0x0001;
const BODY_M = 0x0002;
const WEAP_M = 0x0004;

function cg(membership: number, filter: number) {
  return (membership << 16) | filter;
}

const WALL_CG = cg(WALL_M, BODY_M | WEAP_M);
const BODY_CG = cg(BODY_M, WALL_M | BODY_M | WEAP_M);
const WEAP_CG = cg(WEAP_M, WALL_M | BODY_M | WEAP_M);

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
  const w = room.size.x;
  const h = room.size.y;
  addWall(world, w / 2, -WALL_HT / 2, w / 2 + WALL_HT, WALL_HT / 2); // top
  addWall(world, w / 2, h + WALL_HT / 2, w / 2 + WALL_HT, WALL_HT / 2); // bottom
  addWall(world, -WALL_HT / 2, h / 2, WALL_HT / 2, h / 2 + WALL_HT); // left
  addWall(world, w + WALL_HT / 2, h / 2, WALL_HT / 2, h / 2 + WALL_HT); // right

  return { world, handles: {}, meta: new Map() };
}

function addWall(world: RAPIER.World, x: number, y: number, hx: number, hy: number) {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y));
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(hx, hy).setRestitution(RESTITUTION).setCollisionGroups(WALL_CG),
    body,
  );
}

export function destroyPhysicsWorld(pw: PhysicsWorld): void {
  pw.world.free();
}

// ─────────────────────────────────────────────────────────────────────
// Add / remove player
// ─────────────────────────────────────────────────────────────────────

export function addPlayer(pw: PhysicsWorld, player: Player): void {
  const { world } = pw;

  // ── Player body (no gravity, linear damping) ──────────────────
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(player.position.x, player.position.y)
      .setLinvel(player.velocity.x, player.velocity.y)
      .setGravityScale(0)
      .setLinearDamping(LINEAR_DAMPING)
      .setCcdEnabled(false),
  );

  const col = world.createCollider(
    RAPIER.ColliderDesc.ball(player.radius)
      .setMass(player.weight * PLAYER_MASS_SCALE)
      .setRestitution(RESTITUTION)
      .setCollisionGroups(BODY_CG)
      .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
      .setActiveHooks(RAPIER.ActiveHooks.FILTER_CONTACT_PAIRS),
    body,
  );

  const h: PlayerHandles = {
    bodyHandle: body.handle,
    colliderHandle: col.handle,
  };
  pw.meta.set(col.handle, { playerId: player.id, kind: "body" });

  // ── Weapon ────────────────────────────────────────────────────
  match(player.weapon)
    .with({ type: "flail" }, (wp) => {
      initFlail(pw, body, player.id, wp, h);
    })
    .with({ type: "sword" }, (wp) => {
      initSword(pw, body, player, wp, h);
    })
    .with({ type: "aura" }, () => {
      /* handled manually each tick */
    })
    .exhaustive();

  pw.handles[player.id] = h;
}

function initFlail(
  pw: PhysicsWorld,
  playerBody: RAPIER.RigidBody,
  playerId: string,
  wp: FlailWeapon,
  h: PlayerHandles,
) {
  const { world } = pw;

  const fb = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(wp.position.x, wp.position.y)
      .setLinvel(wp.velocity.x, wp.velocity.y)
      .setLinearDamping(LINEAR_DAMPING)
      .setCcdEnabled(true),
  );

  const fc = world.createCollider(
    RAPIER.ColliderDesc.ball(wp.radius)
      .setMass(wp.weight)
      .setRestitution(RESTITUTION)
      .setCollisionGroups(WEAP_CG)
      .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
      .setActiveHooks(RAPIER.ActiveHooks.FILTER_CONTACT_PAIRS),
    fb,
  );

  // Rope joint: constrains max distance = chainLength
  const jt = world.createImpulseJoint(
    RAPIER.JointData.rope(wp.chainLength, { x: 0, y: 0 }, { x: 0, y: 0 }),
    playerBody,
    fb,
    true,
  );
  jt.setContactsEnabled(false); // flail won't collide with own player

  h.weaponBodyHandle = fb.handle;
  h.weaponColliderHandle = fc.handle;
  h.jointHandle = jt.handle;
  pw.meta.set(fc.handle, { playerId, kind: "weapon" });
}

function initSword(
  pw: PhysicsWorld,
  playerBody: RAPIER.RigidBody,
  player: Player,
  wp: SwordWeapon,
  h: PlayerHandles,
) {
  const { world } = pw;

  // Sword centre is at blade midpoint
  const cx = player.position.x + Math.cos(wp.angle) * (wp.length / 2);
  const cy = player.position.y + Math.sin(wp.angle) * (wp.length / 2);

  const sb = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(cx, cy)
      .setRotation(wp.angle)
      .setAngvel(wp.angularVelocity)
      .setGravityScale(1)
      .setAngularDamping(SWORD_ANG_DAMPING)
      .setLinearDamping(0)
      .setCcdEnabled(true),
  );

  const sc = world.createCollider(
    RAPIER.ColliderDesc.cuboid(wp.length / 2, wp.width / 2)
      .setMass(wp.weight)
      .setRestitution(RESTITUTION)
      .setCollisionGroups(WEAP_CG)
      .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS),
    sb,
  );

  // Revolute joint: pivot at player centre = base of sword
  const jt = world.createImpulseJoint(
    RAPIER.JointData.revolute({ x: 0, y: 0 }, { x: -wp.length / 2, y: 0 }),
    playerBody,
    sb,
    true,
  );
  jt.setContactsEnabled(false); // sword won't collide with own player

  h.weaponBodyHandle = sb.handle;
  h.weaponColliderHandle = sc.handle;
  h.jointHandle = jt.handle;
  pw.meta.set(sc.handle, { playerId: player.id, kind: "weapon" });
}

export function removePlayer(pw: PhysicsWorld, playerId: string): void {
  const h = pw.handles[playerId];
  if (!h) return;

  pw.meta.delete(h.colliderHandle);
  if (h.weaponColliderHandle !== undefined) pw.meta.delete(h.weaponColliderHandle);

  // Removing a rigid-body also removes its colliders and joints.
  if (h.weaponBodyHandle !== undefined) {
    pw.world.removeRigidBody(pw.world.getRigidBody(h.weaponBodyHandle));
  }

  pw.world.removeRigidBody(pw.world.getRigidBody(h.bodyHandle));

  delete pw.handles[playerId];
}

// ─────────────────────────────────────────────────────────────────────
// Physics step
// ─────────────────────────────────────────────────────────────────────

export function stepPhysics(pw: PhysicsWorld, room: Room, elapsedTime: number): Damage[] {
  const { world } = pw;
  const damages: Damage[] = [];

  // ── 1. Apply forces ─────────────────────────────────────────────
  for (const player of Object.values(room.players)) {
    applyPlayerForces(pw, player);
  }

  // ── 2. Rapier step ──────────────────────────────────────────────
  const eq = new RAPIER.EventQueue(true);
  world.timestep = elapsedTime;

  // Physics hooks: filter self-collisions (same player's body↔weapon)
  const hooks: RAPIER.PhysicsHooks = {
    filterContactPair(c1, c2) {
      const m1 = pw.meta.get(c1);
      const m2 = pw.meta.get(c2);
      if (m1 && m2 && m1.playerId === m2.playerId) return null;
      return RAPIER.SolverFlags.COMPUTE_IMPULSE;
    },
    filterIntersectionPair(c1, c2) {
      const m1 = pw.meta.get(c1);
      const m2 = pw.meta.get(c2);
      if (m1 && m2 && m1.playerId === m2.playerId) return false;
      return true;
    },
  };
  world.step(eq, hooks);

  // ── 3. Read back into Room state ────────────────────────────────
  for (const player of Object.values(room.players)) {
    readBackState(pw, player, room);
  }

  // ── 4. Flail chain bounce (manual, preserves old super-elastic feel)
  for (const player of Object.values(room.players)) {
    if (player.weapon.type === "flail") {
      applyFlailChainBounce(pw, player, player.weapon);
    }
  }

  // ── 5. Contact force events → damage ────────────────────────────
  eq.drainContactForceEvents((ev) => {
    contactToDamage(pw, room, ev, damages);
  });

  // ── 6. Aura effects (manual) ────────────────────────────────────
  applyAuraEffects(pw, room, elapsedTime, damages);

  eq.free();
  return damages;
}

// ─────────────────────────────────────────────────────────────────────
// Step helpers
// ─────────────────────────────────────────────────────────────────────

function applyPlayerForces(pw: PhysicsWorld, player: Player) {
  const h = pw.handles[player.id];
  if (!h) return;
  const body = pw.world.getRigidBody(h.bodyHandle);

  // Log-scaled acceleration (original game feel)
  const ax =
    player.acceleration.x *
    Math.log2(Math.max(2, Math.abs(player.acceleration.x - player.velocity.x) / 2));
  const ay =
    player.acceleration.y *
    Math.log2(Math.max(2, Math.abs(player.acceleration.y - player.velocity.y) / 2));

  const m = body.mass();
  body.resetForces(true);
  body.addForce({ x: ax * m, y: ay * m }, true);

  // Sword: inertial pseudo-force opposing the player's input acceleration.
  // This makes the sword trail behind when the player accelerates.
  if (player.weapon.type === "sword" && h.weaponBodyHandle !== undefined) {
    const sb = pw.world.getRigidBody(h.weaponBodyHandle);
    const sm = sb.mass();
    sb.resetForces(true);
    sb.addForce(
      {
        x: -player.acceleration.x * sm * SWORD_INERTIAL_MULT,
        y: -player.acceleration.y * sm * SWORD_INERTIAL_MULT,
      },
      true,
    );
  }
}

function readBackState(pw: PhysicsWorld, player: Player, room: Room) {
  const h = pw.handles[player.id];
  if (!h) return;
  const body = pw.world.getRigidBody(h.bodyHandle);

  const p = body.translation();
  const v = body.linvel();
  player.position = { x: p.x, y: p.y };
  player.velocity = { x: v.x, y: v.y };

  // Clamp player speed
  const spd = Math.sqrt(v.x * v.x + v.y * v.y);
  if (spd > room.maxPlayerSpeed) {
    const s = room.maxPlayerSpeed / spd;
    player.velocity = { x: v.x * s, y: v.y * s };
    body.setLinvel(player.velocity, true);
  }

  match(player.weapon)
    .with({ type: "flail" }, (wp) => {
      if (h.weaponBodyHandle === undefined) return;
      const wb = pw.world.getRigidBody(h.weaponBodyHandle);
      const wp2 = wb.translation();
      const wv = wb.linvel();
      wp.position = { x: wp2.x, y: wp2.y };
      wp.velocity = { x: wv.x, y: wv.y };

      // Clamp flail speed
      const ws = Math.sqrt(wv.x * wv.x + wv.y * wv.y);
      if (ws > wp.maxSpeed) {
        const r = wp.maxSpeed / ws;
        wp.velocity = { x: wv.x * r, y: wv.y * r };
        wb.setLinvel(wp.velocity, true);
      }
    })
    .with({ type: "sword" }, (wp) => {
      if (h.weaponBodyHandle === undefined) return;
      const wb = pw.world.getRigidBody(h.weaponBodyHandle);
      wp.angle = wb.rotation();
      wp.angularVelocity = wb.angvel();

      // Clamp angular speed
      if (Math.abs(wp.angularVelocity) > wp.maxAngularSpeed) {
        wp.angularVelocity = Math.sign(wp.angularVelocity) * wp.maxAngularSpeed;
        wb.setAngvel(wp.angularVelocity, true);
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
function applyFlailChainBounce(pw: PhysicsWorld, player: Player, weapon: FlailWeapon) {
  const dx = player.position.x - weapon.position.x;
  const dy = player.position.y - weapon.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Only apply bounce when the chain is taut (distance at or beyond chain length)
  if (dist < weapon.chainLength * 0.98) return;

  const nx = dist > 0 ? dx / dist : 0;
  const ny = dist > 0 ? dy / dist : 0;

  // Relative velocity along the chain (positive = moving apart)
  const relVx = player.velocity.x - weapon.velocity.x;
  const relVy = player.velocity.y - weapon.velocity.y;
  const relVAlongChain = relVx * nx + relVy * ny;

  // Only bounce if the flail is pulling away from the player
  if (relVAlongChain >= 0) return;

  // Add bounce velocity towards the player (old ELASTICITY scaling)
  const bounce = Math.abs(relVAlongChain) * (ELASTICITY - 1.0);
  weapon.velocity.x += nx * bounce;
  weapon.velocity.y += ny * bounce;

  // Sync back to Rapier
  const h = pw.handles[player.id];
  if (!h || h.weaponBodyHandle === undefined) return;
  pw.world
    .getRigidBody(h.weaponBodyHandle)
    .setLinvel({ x: weapon.velocity.x, y: weapon.velocity.y }, true);
}

function contactToDamage(
  pw: PhysicsWorld,
  room: Room,
  ev: RAPIER.TempContactForceEvent,
  out: Damage[],
) {
  const m1 = pw.meta.get(ev.collider1());
  const m2 = pw.meta.get(ev.collider2());
  if (!m1 || !m2) return; // wall involved
  if (m1.playerId === m2.playerId) return; // self (shouldn't happen)

  const f = ev.totalForceMagnitude();

  // weapon → enemy body
  if (m1.kind === "weapon" && m2.kind === "body") {
    out.push({
      type: "weaponCollision",
      playerId: m1.playerId,
      damagedPlayerId: m2.playerId,
      amount: f * DMG_WEAPON_SCALE,
    });
    applyHitKnockback(pw, room, m1.playerId, m2.playerId, f);
  } else if (m2.kind === "weapon" && m1.kind === "body") {
    out.push({
      type: "weaponCollision",
      playerId: m2.playerId,
      damagedPlayerId: m1.playerId,
      amount: f * DMG_WEAPON_SCALE,
    });
    applyHitKnockback(pw, room, m2.playerId, m1.playerId, f);
  }
  // body → body (use DMG_BODY_SCALE to compensate for inflated player mass)
  else if (m1.kind === "body" && m2.kind === "body") {
    const p1 = room.players[m1.playerId];
    const p2 = room.players[m2.playerId];
    if (!p1 || !p2) return;
    const tw = p1.weight + p2.weight;
    out.push({
      type: "playerCollision",
      playerId: p2.id,
      damagedPlayerId: p1.id,
      amount: (f * DMG_BODY_SCALE * p2.weight) / tw,
    });
    out.push({
      type: "playerCollision",
      playerId: p1.id,
      damagedPlayerId: p2.id,
      amount: (f * DMG_BODY_SCALE * p1.weight) / tw,
    });
  }
  // weapon ↔ weapon: physics only, no damage
}

/**
 * Applies an extra knockback impulse to the enemy body when hit by a weapon.
 * Direction: from the weapon towards the enemy.
 * Magnitude: proportional to the Rapier contact force × HIT_KNOCKBACK_MULT.
 *
 * Also updates the Room player velocity so the knockback is visible
 * in the same tick's network broadcast.
 */
function applyHitKnockback(
  pw: PhysicsWorld,
  room: Room,
  attackerId: string,
  enemyId: string,
  forceMagnitude: number,
) {
  const aH = pw.handles[attackerId];
  const eH = pw.handles[enemyId];
  if (!aH || !eH) return;

  // Use the weapon body position if available, fall back to player body
  const sourceHandle = aH.weaponBodyHandle ?? aH.bodyHandle;
  const sourceBody = pw.world.getRigidBody(sourceHandle);
  const enemyBody = pw.world.getRigidBody(eH.bodyHandle);

  const sp = sourceBody.translation();
  const ep = enemyBody.translation();

  const dx = ep.x - sp.x;
  const dy = ep.y - sp.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const impulse = forceMagnitude * HIT_KNOCKBACK_MULT;

  // Apply to Rapier body (takes effect next step)
  enemyBody.applyImpulse({ x: nx * impulse, y: ny * impulse }, true);

  // Also update Room state so the knockback is broadcast this tick
  const enemy = room.players[enemyId];
  if (enemy) {
    const mass = enemyBody.mass();
    enemy.velocity.x += (nx * impulse) / mass;
    enemy.velocity.y += (ny * impulse) / mass;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Aura (manual – no Rapier representation)
// ─────────────────────────────────────────────────────────────────────

/**
 * Replicates the old aura weapon behaviour: enlarged circle collision
 * check that pushes entities apart and deals damage.
 */
function applyAuraEffects(pw: PhysicsWorld, room: Room, elapsedTime: number, damages: Damage[]) {
  for (const player of Object.values(room.players)) {
    if (player.weapon.type !== "aura") continue;
    const weapon = player.weapon;

    for (const other of Object.values(room.players)) {
      if (player.id === other.id) continue;

      const dx = other.position.x - player.position.x;
      const dy = other.position.y - player.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = player.radius + weapon.radiusFromPlayer + other.radius;

      if (dist >= minDist) continue;

      const overlap = minDist - dist;
      const nx = dist > 0 ? dx / dist : 1;
      const ny = dist > 0 ? dy / dist : 0;

      const push = overlap * 2; // old code pushes both sides by 2× overlap
      const ew = player.weight * weapon.playerCollisionWeightMultiplier;
      const tw = ew + other.weight;

      // Push apart (replicating handleRawCirclesCollision)
      other.position.x += nx * push;
      other.position.y += ny * push;
      other.velocity.x += (nx * push * ELASTICITY * (ew / tw)) / elapsedTime;
      other.velocity.y += (ny * push * ELASTICITY * (ew / tw)) / elapsedTime;

      player.position.x -= nx * push;
      player.position.y -= ny * push;
      player.velocity.x -= (nx * push * ELASTICITY * (other.weight / tw)) / elapsedTime;
      player.velocity.y -= (ny * push * ELASTICITY * (other.weight / tw)) / elapsedTime;

      // Sync modified positions back to Rapier
      syncBodyToRapier(pw, player);
      syncBodyToRapier(pw, other);

      const dmg = (overlap * (ew / tw) * weapon.damageMultiplier) / elapsedTime;
      if (dmg > 0) {
        damages.push({
          type: "weaponCollision",
          damagedPlayerId: other.id,
          playerId: player.id,
          amount: dmg,
        });
      }

      // Aura vs aura
      if (other.weapon.type === "aura") {
        const ow = other.weapon;
        const auraDist =
          player.radius + weapon.radiusFromPlayer + other.radius + ow.radiusFromPlayer;

        if (dist < auraDist) {
          const aOverlap = auraDist - dist;
          const oew = other.weight * ow.playerCollisionWeightMultiplier;
          const atw = ew + oew;

          const pd = (aOverlap * (oew / atw)) / elapsedTime;
          const od = (aOverlap * (ew / atw)) / elapsedTime;

          if (pd > 0) {
            damages.push({
              type: "weaponCollision",
              damagedPlayerId: player.id,
              playerId: other.id,
              amount: pd,
            });
          }
          if (od > 0) {
            damages.push({
              type: "weaponCollision",
              damagedPlayerId: other.id,
              playerId: player.id,
              amount: od,
            });
          }
        }
      }
    }
  }
}

function syncBodyToRapier(pw: PhysicsWorld, player: Player) {
  const h = pw.handles[player.id];
  if (!h) return;
  const b = pw.world.getRigidBody(h.bodyHandle);
  b.setTranslation({ x: player.position.x, y: player.position.y }, true);
  b.setLinvel({ x: player.velocity.x, y: player.velocity.y }, true);
}
