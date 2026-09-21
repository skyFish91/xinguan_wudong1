import { MidwayConfig } from '@midwayjs/core';
import { join } from 'path';

export default {
  // 使用环境变量，缺省给本地开发默认值
  keys: process.env.APP_KEYS || 'wudong-secret-key-2026',
  koa: {
    port: Number(process.env.SERVER_PORT || 7001),
  },
  typeorm: {
    dataSource: {
      default: {
        type: 'mysql',
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 3307),
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'wudong',
        synchronize: false,
        logging: false,
        entities: ['**/entity/*.entity.{ts,js}'],
        timezone: '+08:00',
        // mysql2 驱动默认将 BIGINT 读为字符串，此处改为数字返回（本库 id 均为小数字，无精度风险）
        extra: {
          supportBigNumbers: true,
          bigNumberStrings: false,
        },
      },
    },
  },
  redis: {
    client: {
      port: Number(process.env.REDIS_PORT || 6379),
      host: process.env.REDIS_HOST || '127.0.0.1',
      password: process.env.REDIS_PASSWORD || undefined,
      db: Number(process.env.REDIS_DB || 0),
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'wudong-jwt-secret-2026',
    expiresIn: '2h',
  },
  // 上传配置：本地磁盘存储
  upload: {
    mode: 'file',
    fileSize: '110mb',
    whitelist: ['.jpg', '.jpeg', '.png', '.webp', '.mp4'],
    tmpdir: join(__dirname, '../../uploads/tmp'),
    cleanTimeout: 5 * 60 * 1000,
    base64: false,
  },
  staticFile: {
    dirs: {
      default: {
        prefix: '/uploads/',
        dir: join(__dirname, '../../uploads'),
      },
    },
  },
  cors: {
    origin: '*',
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
  },
  swagger: {
    title: '乌东文旅"衣食住行"综合服务平台 API',
    description: '模块一衣/模块二食/模块三住/模块四行/模块五社区/模块六平台管理 + 公共能力',
    version: '1.0.0',
    termsOfService: '',
    contact: { name: '乌东文旅开发小组', email: '' },
    license: { name: 'MIT' },
  },
} as MidwayConfig;
