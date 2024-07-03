import { Player } from "./player";

/**
 * Container of all the data and players inside a game room.
 */
export type Room = {
  /**
   * Unique identifier of the room.
   */
  id: number;

  /**
   * Players inside the room.
   *
   * The key is the Socket ID of the player.
   */
  players: Record<string, Player>;
};
