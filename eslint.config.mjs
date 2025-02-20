import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx,jsx,css}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    },
    plugins: {
      react: pluginReact,
      '@typescript-eslint': tseslint
    },
    extends: [
      pluginJs.configs.recommended,
      ...tseslint.configs.recommended,
      pluginReact.configs.flat.recommended
    ],
    ignorePatterns: [
      "node_modules/",
      "dist/",
      "build/"
    ],
  },
];
