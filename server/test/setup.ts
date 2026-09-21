import { dataSource, truncateAll } from './helpers/db';

/** 全局测试环境：每个测试文件连接一次测试库，每个用例前清空数据 */
beforeAll(async () => {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }
});

afterAll(async () => {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
});

beforeEach(async () => {
  await truncateAll();
});
