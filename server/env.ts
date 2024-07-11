import dotenv from "dotenv";
import { z } from "zod";

const envZod = z.object({
  PORT: z.coerce.number(),
  BASE_PATH: z.string(),
});

dotenv.config({ path: [".env", ".env.defaults"] });

export const env = Object.freeze(envZod.parse(process.env));
