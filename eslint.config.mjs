import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tselint from "typescript-eslint";
import prettier from "eslint-config-prettier/flat";

export default defineConfig(
    { ignores: ["dist/**"] },
    js.configs.recommended,
    tselint.config.recommended,
    prettier,
);
