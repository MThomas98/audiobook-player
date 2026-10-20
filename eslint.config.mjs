import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import importX from "eslint-plugin-import-x";

export default defineConfig(
    { ignores: ["dist/**", "dist-test/**", "out/**"] },
    js.configs.recommended,
    tseslint.configs.recommended,
    stylistic.configs.customize({
        indent: 4,
        quotes: "double",
        semi: true,
        braceStyle: "allman",
        jsx: true,
    }),
    {
        rules: {
            "@stylistic/operator-linebreak": ["error", "after"],
            "@stylistic/linebreak-style": ["error", "unix"],
            "@typescript-eslint/consistent-type-imports": "error",
        },
    },
    {
        files: ["src/**/*.{ts,tsx}", "test/**/*.ts"],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            "@typescript-eslint/no-floating-promises": ["error", {
                allowForKnownSafeCalls: [
                    { from: "package", package: "node:test", name: ["describe", "it"] },
                ],
            }],
        },
    },
    {
        plugins: { "import-x": importX },
        rules: {
            "import-x/order": ["error", {
                "groups": [["builtin", "external"], ["parent", "sibling", "index"], "type"],
                "newlines-between": "always",
            }],
        },
    },
);
