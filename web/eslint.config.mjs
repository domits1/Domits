export default [
  { files: ["**/*.{js,mjs,cjs,jsx,css}"] },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,

  // Separate TypeScript configuration
  {
    files: ["**/*.{ts,tsx}"],
    ...tseslint.configs.recommended,
  },
];
