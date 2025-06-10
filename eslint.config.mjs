// Import required ESLint utilities
// FlatCompat helps migrate from the old ESLint config format to the new flat config format
import { FlatCompat } from '@eslint/eslintrc';
// Import TypeScript ESLint utilities for TypeScript-specific linting
import tseslint from 'typescript-eslint';

// Initialize FlatCompat with the current directory as base
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

// Export the ESLint configuration using the new flat config format
export default tseslint.config(
  // Base configuration that applies to all files
  {
    // Ignore the .next directory which contains Next.js build output
    ignores: ['.next'],
  },
  // Extend Next.js recommended ESLint configuration for core web vitals
  ...compat.extends('next/core-web-vitals'),
  // TypeScript-specific configuration
  {
    // Apply these rules only to TypeScript and TSX files
    files: ['**/*.ts', '**/*.tsx'],
    extends: [
      // Enable recommended TypeScript ESLint rules
      ...tseslint.configs.recommended,
      // Enable type-checking rules
      ...tseslint.configs.recommendedTypeChecked,
      // Enable stylistic rules with type checking
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      // Allow both Array<T> and T[] syntax
      '@typescript-eslint/array-type': 'off',
      // Allow both interface and type for type definitions
      '@typescript-eslint/consistent-type-definitions': 'off',
      // Enforce using type imports for better tree-shaking
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Warn about unused variables, but ignore parameters starting with underscore
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      // Allow async functions without await
      '@typescript-eslint/require-await': 'off',
      // Prevent common Promise misuse patterns, but allow void returns in JSX attributes
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  // Global configuration options
  {
    // Report any unused eslint-disable comments
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    // Configure language-specific options
    languageOptions: {
      parserOptions: {
        // Enable TypeScript project service for better type checking
        projectService: true,
      },
    },
  }
);
