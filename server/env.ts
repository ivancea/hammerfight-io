import dotenv from "dotenv";
import { z } from "zod";

const envZod = z.object({
  PORT: z.coerce.number(),
  BASE_PATH: z.string(),

  // SSL
  SSL_CERTIFICATE: z.string().optional(),
  SSL_PRIVATE_KEY: z.string().optional(),

  // ElasticSearch Cloud logging
  ELASTIC_CLOUD_ID: z.string().optional(),
  ELASTIC_CLOUD_API_KEY: z.string().optional(),
  ELASTIC_CLOUD_INDEX_NAMESPACE: z.string().optional(),
  ELASTIC_CREATE_INDICES: z.coerce.boolean().default(false),

  // ElasticSearch Serverless logging
  ELASTIC_SERVERLESS_ID: z.string().optional(),
  ELASTIC_SERVERLESS_API_KEY: z.string().optional(),
  ELASTIC_SERVERLESS_INDEX_NAMESPACE: z.string().optional(),
});

dotenv.config({ path: [".env", ".env.defaults"] });

export const env = Object.freeze(envZod.parse(process.env));
