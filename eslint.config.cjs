// eslint.config.cjs  (flat config for ESLint ≥ 9)

module.exports = [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    ignores: ["node_modules", "dist"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      // your custom rules
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];
