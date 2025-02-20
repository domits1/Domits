import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser, // for browser-specific globals
        jest: true,  // adds Jest globals like describe, test, and expect
      },
    },
  },
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    ignores: [
      "node_modules/*",
      "dist/*",
      "build/*",
      "__tests__/*",  // Ignore test files
      "amplify/*",     // Ignore compiled code in Amplify
    ],
  },
  {
    settings: {
      react: {
        version: "detect",  // Automatically detects the React version
      },
    },
  },
];
