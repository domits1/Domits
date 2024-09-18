import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import tseslint from "@typescript-eslint/eslint-plugin";
import babelParser from "@babel/eslint-parser";

export default {
  languageOptions: {
    parser: babelParser,
    parserOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      babelOptions: {
        presets: ["@babel/preset-env", "@babel/preset-react", "@babel/preset-typescript"],
      },
    },
    globals: {
      browser: true,
    },
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  plugins: {
    react: pluginReact,
    "@typescript-eslint": tseslint,
  },
  rules: {
    "no-unused-vars": "error",
    "prefer-const": ["error", { "ignoreReadBeforeAssign": true }],
    ...pluginJs.configs.recommended.rules,
    ...tseslint.configs.recommended.rules,
    ...pluginReact.configs.recommended.rules,
  },
  files: ["src/**/*.{js,mjs,cjs,ts,jsx,tsx}"],
};
