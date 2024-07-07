export type Damage = PlayerCollisionDamage | WeaponCollisionDamage;

type BaseDamage = {
  type: string;
  damagedPlayerId: string;
  amount: number;
};

type PlayerCollisionDamage = BaseDamage & {
  type: "playerCollision";
  playerId: string;
};

type WeaponCollisionDamage = BaseDamage & {
  type: "weaponCollision";
  playerId: string;
};
