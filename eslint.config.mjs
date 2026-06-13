import eslintPluginAstro from "eslint-plugin-astro";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  // Global ignores
  {
    ignores: [
      "dist/",
      "node_modules/",
      ".astro/",
      "public/pagefind/",
      "*.generated.*",
      "**/*.d.ts",
    ],
  },

  // TS/JS files
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mjs", "**/*.cjs"],
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "warn",
      "prefer-const": "warn",
    },
  },

  // Astro files
  ...eslintPluginAstro.configs.recommended,

  // Astro TS blocks
  {
    files: ["**/*.astro"],
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
