import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  globalIgnores([
    "build/**",
    "dist/**",
    ".astro/**",
    ".vercel/**",
  ]),
]);

export default eslintConfig;
