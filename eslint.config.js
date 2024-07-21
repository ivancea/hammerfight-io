// @ts-check

import { includeIgnoreFile } from "@eslint/compat";
import eslint from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import path from "path";
import tseslint from "typescript-eslint";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, ".gitignore");

export default tseslint.config(
  includeIgnoreFile(gitignorePath),
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.ts"],
  })),
  eslintPluginPrettierRecommended,
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/no-dynamic-delete": "off",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
    },
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    // Server rules
    files: ["server/**/*.ts"],
    rules: {
      "no-console": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["*/client/*"],
              message: "Server code cannot use client code",
            },
          ],
        },
      ],
    },
  },
  {
    // Client rules
    files: ["client/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["*/server/*"],
              message: "Client code cannot use server code",
            },
          ],
        },
      ],
    },
  },
);
