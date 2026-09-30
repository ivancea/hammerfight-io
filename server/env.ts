import dotenv from "dotenv";
import { z } from "zod";

const optionalEnvString = z
  .string()
  .optional()
  .transform((value) => (value === "" ? undefined : value));

const envZod = z.object({
  PORT: z.coerce.number(),
  BASE_PATH: z.string(),

  // SSL
  SSL_CERTIFICATE: optionalEnvString,
  SSL_PRIVATE_KEY: optionalEnvString,

  // ElasticSearch Cloud logging
  ELASTIC_CLOUD_ID: optionalEnvString,
  ELASTIC_CLOUD_API_KEY: optionalEnvString,
  ELASTIC_CLOUD_INDEX_NAMESPACE: optionalEnvString,
  ELASTIC_CREATE_INDICES: z.coerce.boolean().default(false),

  // ElasticSearch Serverless logging
  ELASTIC_SERVERLESS_ID: optionalEnvString,
  ELASTIC_SERVERLESS_API_KEY: optionalEnvString,
  ELASTIC_SERVERLESS_INDEX_NAMESPACE: optionalEnvString,
});

dotenv.config({ path: [".env", ".env.defaults"] });

export const env = Object.freeze(envZod.parse(process.env));
