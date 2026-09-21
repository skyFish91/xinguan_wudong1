/**
 * 准备测试库 wudong_test：读取 DDL 将库名替换后全量执行（幂等，可重复运行）
 * 本地与 CI 共用：node scripts/prepare-test-db.js
 * 连接参数走环境变量，缺省与 test/helpers/db.ts 保持一致
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');

const sqlPath = path.join(__dirname, '../../sql/01-ddl.sql');
const sql = fs.readFileSync(sqlPath, 'utf8').replace(/wudong/g, 'wudong_test');

const conn = mysql.createConnection({
  host: process.env.TEST_DB_HOST || '127.0.0.1',
  port: Number(process.env.TEST_DB_PORT || 3306),
  user: process.env.TEST_DB_USER || 'root',
  password: process.env.TEST_DB_PASSWORD || 'root',
  multipleStatements: true,
});

conn.query(sql, (err) => {
  if (err) {
    console.error('初始化测试库失败：', err.message);
    process.exitCode = 1;
  } else {
    console.log('测试库 wudong_test 已就绪');
  }
  conn.end();
});
