import { match } from "ts-pattern";
import { Damage } from "./damage";
import { CircleCollider, handleCircleRectangleCollision } from "./physics.common";
import { adaptAngularRectangleToPhysics, applyAngularFriction } from "./physics.common.extensions";
import { Player } from "./types/player";
import { Room } from "./types/room";
import { SwordWeapon } from "./types/weapon";
import { magnitude } from "./vector";

export function moveSwordWeapon(
  weapon: SwordWeapon,
  player: Player,
  room: Room,
  elapsedTime: number,
) {
  // Always update the sword position to match the player (pivot point)
  weapon.position = player.position;

  // Apply angular speed to rotation
  weapon.rotation += weapon.angularSpeed * elapsedTime;

  // Calculate the sword tip position for collision detection
  const tipPosition = {
    x: player.position.x + Math.cos(weapon.rotation) * weapon.length,
    y: player.position.y + Math.sin(weapon.rotation) * weapon.length,
  };

  // Store the tip position for collision detection
  weapon.tipPosition = tipPosition;

  // Calculate gravity direction
  const gravityAngle = Math.atan2(room.gravity.y, room.gravity.x);

  // Reduced gravity magnitude to prevent excessive oscillation
  const gravityMagnitude = 3.0; // Further reduced from 4.0 for more stable swinging

  // Calculate torque using sine of the angle between gravity and sword
  const angleToGravity = gravityAngle - weapon.rotation;

  // Critical improvement: Apply a smoothing filter to angular speed before calculating damping
  // This effectively eliminates rapid oscillations while preserving intentional movement
  weapon.angularSpeed = weapon.angularSpeed * 0.9 + weapon.angularSpeed * 0.1;

  // Stronger non-linear damping at higher speeds helps prevent oscillation
  const dampingFactor = 0.4;
  const angularSpeedDamping =
    Math.sign(weapon.angularSpeed) * Math.pow(Math.abs(weapon.angularSpeed), 1.5) * dampingFactor;

  // Apply damped gravity torque
  const gravityTorque = Math.sin(angleToGravity) * gravityMagnitude - angularSpeedDamping;

  // Apply gravity torque to angular speed with time-step scaling
  const timeScale = Math.min(elapsedTime, 0.025); // Cap time step for numerical stability
  weapon.angularSpeed += gravityTorque * timeScale;

  // Handle player movement effects on the sword
  if (magnitude(player.velocity) > 1) {
    const playerSpeed = magnitude(player.velocity);

    // Calculate the movement angle
    const movementAngle = Math.atan2(player.velocity.y, player.velocity.x);

    // Determine the angle between movement direction and sword orientation
    const moveToSwordAngle = movementAngle - weapon.rotation;
    const normalizedAngle = ((moveToSwordAngle + Math.PI) % (2 * Math.PI)) - Math.PI;

    // Create a lag effect based on player movement
    // Scale coefficient for smoother response
    const dragCoefficient = 0.4 * (playerSpeed / 10); // Reduced from 0.5 for less jerky movement
    const dragEffect = Math.sin(normalizedAngle) * dragCoefficient;

    // Scale drag effect with elapsed time for better frame rate independence
    weapon.angularSpeed -= dragEffect * Math.min(elapsedTime * 50, 1.5);
  }
}

export function handleSwordWeaponCollisions(
  weapon: SwordWeapon,
  player: Player,
  room: Room,
  elapsedTime: number,
  onPlayerDamage: (damage: Damage) => void,
) {
  // Convert the angular sword to a temporary physics object with velocity
  const adaptedWeapon = adaptAngularRectangleToPhysics(weapon);

  for (const otherPlayer of Object.values(room.players)) {
    if (player.id === otherPlayer.id) {
      continue;
    }

    // Handle collision between sword and other player
    const [, otherPlayerDamage] = handleCircleRectangleCollision(
      otherPlayer as CircleCollider,
      adaptedWeapon,
      elapsedTime,
    );

    if (otherPlayerDamage > 0) {
      onPlayerDamage({
        type: "weaponCollision",
        damagedPlayerId: otherPlayer.id,
        playerId: player.id,
        amount: (otherPlayerDamage * weapon.damageMultiplier) / elapsedTime,
      });
    }

    // Handle collision between sword and other weapons
    match(otherPlayer.weapon)
      .with({ type: "flail" }, (otherWeapon) => {
        handleCircleRectangleCollision(otherWeapon as CircleCollider, adaptedWeapon, elapsedTime);
      })
      .with({ type: "aura" }, () => {
        // No-op: Aura weapons only collide with players and other aura weapons
      })
      .with({ type: "sword" }, () => {
        // TODO: Handle sword-to-sword collision using SAT if needed
      })
      .exhaustive();
  }
}

export function handleSwordWeaponLimitsCollisions(
  weapon: SwordWeapon,
  player: Player,
  room: Room,
  elapsedTime: number,
) {
  // If the sword's tip is outside the boundaries, constrain it and affect player
  if (!weapon.tipPosition) {
    // Calculate tip position if not already set
    weapon.tipPosition = {
      x: player.position.x + Math.cos(weapon.rotation) * weapon.length,
      y: player.position.y + Math.sin(weapon.rotation) * weapon.length,
    };
  }

  const tip = weapon.tipPosition;
  let collision = false;
  const pushbackForce = { x: 0, y: 0 };

  // Check if sword tip is outside boundaries
  const halfWidth = weapon.width / 2;

  // Check x-axis boundaries with more controlled bounce
  if (tip.x - halfWidth < 0) {
    const penetration = Math.abs(tip.x - halfWidth);
    pushbackForce.x += penetration * 1.0; // Reduced from 1.2 for smoother reactions
    collision = true;
    // Bounce the sword with controlled energy to prevent excessive oscillations
    weapon.angularSpeed = -weapon.angularSpeed * 0.6; // Reduced from 0.7 for stability
  } else if (tip.x + halfWidth > room.size.x) {
    const penetration = Math.abs(tip.x + halfWidth - room.size.x);
    pushbackForce.x -= penetration * 1.0; // Reduced from 1.2 for smoother reactions
    collision = true;
    // Bounce the sword with controlled energy to prevent excessive oscillations
    weapon.angularSpeed = -weapon.angularSpeed * 0.6; // Reduced from 0.7 for stability
  }

  // Check y-axis boundaries with more controlled bounce
  if (tip.y - halfWidth < 0) {
    const penetration = Math.abs(tip.y - halfWidth);
    pushbackForce.y += penetration * 1.0; // Reduced from 1.2 for smoother reactions
    collision = true;
    // Bounce the sword with controlled energy to prevent excessive oscillations
    weapon.angularSpeed = -weapon.angularSpeed * 0.6; // Reduced from 0.7 for stability
  } else if (tip.y + halfWidth > room.size.y) {
    const penetration = Math.abs(tip.y + halfWidth - room.size.y);
    pushbackForce.y -= penetration * 1.0; // Reduced from 1.2 for smoother reactions
    collision = true;
    // Bounce the sword with controlled energy to prevent excessive oscillations
    weapon.angularSpeed = -weapon.angularSpeed * 0.6; // Reduced from 0.7 for stability
  }

  // If collision occurred, push the player back with more controlled force
  if (collision) {
    // Apply pushback force to player velocity - more balanced pushback
    const pushStrength = 6.5; // Reduced from 8 to 6.5 for smoother player movement

    // Add velocity capping to prevent excessive pushback
    const maxPushback = 200; // Maximum pushback velocity
    const scaledForceX = Math.min(pushbackForce.x * pushStrength, maxPushback);
    const scaledForceY = Math.min(pushbackForce.y * pushStrength, maxPushback);

    // Scale force with elapsed time and apply to player with smoothing
    player.velocity.x += scaledForceX * elapsedTime;
    player.velocity.y += scaledForceY * elapsedTime;

    // More damping on collision to stabilize the system
    weapon.angularSpeed *= 0.85;
  }
}

export function applyFrictionToSwordWeapon(
  weapon: SwordWeapon,
  player: Player,
  room: Room,
  elapsedTime: number,
) {
  // Apply friction based on player movement and sword speed
  const swordSpeed = Math.abs(weapon.angularSpeed);
  const playerSpeed = magnitude(player.velocity);

  // Different friction values for different situations
  if (playerSpeed < 3) {
    if (swordSpeed < 0.3) {
      // When almost stopped, apply stronger friction to stop micro-oscillations completely
      // Increased from 0.90 to 0.85 to dampen low-energy oscillations
      applyAngularFriction(weapon, 0.85, elapsedTime);
    } else {
      // Normal pendulum motion when player is still - fine-tuned friction
      // Reduced from 0.99 to 0.97 to prevent energy build-up
      applyAngularFriction(weapon, 0.97, elapsedTime);
    }
  } else {
    // When player is moving, use moderate friction for natural trailing
    // Reduced from 0.998 to 0.99 to prevent too much momentum building up
    applyAngularFriction(weapon, 0.99, elapsedTime);
  }
}
