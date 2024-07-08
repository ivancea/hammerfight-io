import Two from "two.js";
import { Texture } from "two.js/src/effects/texture";
import { assert } from "../common/errors";
import ship1Image from "./assets/ships/ship1.png";
import ship2Image from "./assets/ships/ship2.png";
import ship3Image from "./assets/ships/ship3.png";
import ship4Image from "./assets/ships/ship4.png";
import flailImage from "./assets/weapons/flail.png";

export const SHIP_IMAGE_SIZE = 100;
export const FLAIL_IMAGE_SIZE = 100;

let texturesTwo: Two | undefined;
let textures:
  | {
      ships: Texture[];
      weapons: {
        flail: Texture;
      };
    }
  | undefined;

export function loadTextures(two: Two) {
  if (texturesTwo != two) {
    textures = {
      ships: [ship1Image, ship2Image, ship3Image, ship4Image].map((image) =>
        two.makeTexture(image),
      ),
      weapons: {
        flail: two.makeTexture(flailImage),
      },
    };
    texturesTwo = two;
  }
}

export function getTextures(two: Two) {
  loadTextures(two);

  assert(textures, "Textures not loaded");

  return textures;
}
