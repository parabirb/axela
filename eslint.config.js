import xo from "xo";
import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";

export default defineConfig([
    {
        files: ["**/*.{js,mjs,cjs}"],
        plugins: { js },
        extends: ["js/recommended"],
    },
    {
        files: ["**/*.{js,mjs,cjs}"],
        languageOptions: { globals: globals.node },
    },
    xo.xoToEslintConfig([{ space: 4, prettier: "compat" }]),
    eslintConfigPrettier,
]);
