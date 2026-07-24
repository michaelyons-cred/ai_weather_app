import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Load next.config.ts and .env files into the test environment.
  dir: "./",
});

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  // Playwright specs in tests/ are run by Playwright, not Jest.
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/tests/"],
  // Mirror the tsconfig "@/*" path alias so tests can use it too.
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

// Exported this way so next/jest can load the (async) Next.js config.
export default createJestConfig(config);
