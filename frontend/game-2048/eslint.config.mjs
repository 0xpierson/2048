import js from '@eslint/js';

export default [
    {
        ignores: ['dist/**'],
    },
    {
        ...js.configs.recommended,
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-constant-condition': ['error', { checkLoops: false }],
        },
    },
];

