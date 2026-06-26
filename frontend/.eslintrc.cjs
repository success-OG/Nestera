/** @type {import('eslint').Linter.Config} */
module.exports = {
    extends: [
        "next/core-web-vitals",
        "next/typescript",
        "plugin:@typescript-eslint/recommended",
    ],
    plugins: ["@typescript-eslint"],
    rules: {
        "no-console": ["warn", { allow: ["warn", "error"] }],
        "react/no-unescaped-entities": "error",
        "@typescript-eslint/no-unused-vars": [
            "warn",
            { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
        "@typescript-eslint/no-explicit-any": "warn",
        "prefer-const": "warn",
        "no-var": "error",
    },
    overrides: [
        {
            files: ["*.ts", "*.tsx"],
            rules: {
                "@typescript-eslint/explicit-module-boundary-types": "off",
            },
        },
    ],
};

