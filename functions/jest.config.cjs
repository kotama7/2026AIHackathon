/**
 * Jest config for @village/functions
 *
 * - ESM TypeScript: ts-jest の default-esm preset
 * - .js 拡張子で import している ESM スタイルを strip して .ts を解決
 * - @village/shared を src 直参照
 *
 * 実行は package.json の test スクリプトから NODE_OPTIONS=--experimental-vm-modules で。
 */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  // rules テストは emulator 必須、e2e は実 Gemini 必須なのでデフォルトから除外。
  // それぞれ test:rules / test:e2e:truth-compiler で別実行する。
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/test/rules/', '<rootDir>/test/e2e/'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@village/shared$': '<rootDir>/../packages/shared/src/index.ts',
    '^@village/shared/(.*)$': '<rootDir>/../packages/shared/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: { module: 'ESNext', moduleResolution: 'Bundler' },
      },
    ],
  },
  // emulator host を明示 (test 内で接続するため、_setEnv は test 側で個別に)
  verbose: true,
};
