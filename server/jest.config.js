/** Jest 配置：单元测试跑在独立测试库 wudong_test 上，不污染开发数据 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/entity/**',
    '!src/config/**',
    '!src/configuration.ts',
    '!src/module/auth/auth.dto.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
  testTimeout: 30000,
  // 测试文件共用同一个 wudong_test 库并逐用例清库，必须串行执行避免互相污染
  maxWorkers: 1,
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
};
