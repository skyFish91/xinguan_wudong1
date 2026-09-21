import { Controller, Files, Fields, Inject, Post, Provide } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { ApiOperation, ApiTags } from '@midwayjs/swagger';
import { UploadFileInfo } from '@midwayjs/upload';
import { BizError } from '../../common/BizError';
import { Auth } from '../../common/decorators';
import { SensitiveWordEntity } from '../../entity/platform.entity';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { promises as fs } from 'fs';
import { join, extname } from 'path';
import dayjs from 'dayjs';

/** 上传服务：本地磁盘存储 + 敏感词校验 */
@Provide()
export class UploadService {
  @InjectEntityModel(SensitiveWordEntity)
  sensitiveRepo: Repository<SensitiveWordEntity>;

  async saveFiles(files: UploadFileInfo<string>[]): Promise<{ url: string; name: string }[]> {
    const results: { url: string; name: string }[] = [];
    for (const file of files) {
      const ext = extname(file.filename || '').toLowerCase() || '.jpg';
      const day = dayjs().format('YYYYMMDD');
      const dir = join(process.cwd(), 'uploads', day);
      await fs.mkdir(dir, { recursive: true });
      const newName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
      const dest = join(dir, newName);
      await fs.copyFile(file.data, dest);
      await fs.unlink(file.data).catch(() => {});
      results.push({ url: `/uploads/${day}/${newName}`, name: file.filename || '' });
    }
    return results;
  }

  /** 文本敏感词检测：命中返回命中词列表 */
  async checkSensitive(text: string): Promise<string[]> {
    if (!text) {
      return [];
    }
    const words = await this.sensitiveRepo.find();
    const hits = words.filter(w => text.includes(w.word)).map(w => w.word);
    return hits;
  }
}

@ApiTags(['公共-上传'])
@Controller('/api/upload')
export class UploadController {
  @Inject()
  uploadService: UploadService;

  @ApiOperation({ summary: '上传图片/视频（jpg/png/webp/mp4）' })
  @Auth()
  @Post('/file')
  async upload(@Files() files: UploadFileInfo<string>[], @Fields() fields: Record<string, any>) {
    if (!files || files.length === 0) {
      throw BizError.param('未选择文件');
    }
    // 单张图片 ≤5MB，视频 ≤100MB
    for (const file of files) {
      const size = file.data ? require('fs').statSync(file.data).size : 0;
      const extension = extname(file.filename || '').toLowerCase();
      const isVideo = extension === '.mp4';
      if (!['.jpg', '.jpeg', '.png', '.webp', '.mp4'].includes(extension)) {
        throw BizError.param('仅支持 jpg、jpeg、png、webp 图片或 mp4 视频');
      }
      if (isVideo && size > 100 * 1024 * 1024) {
        throw BizError.param('视频大小不能超过 100MB');
      }
      if (!isVideo && size > 5 * 1024 * 1024) {
        throw BizError.param('图片大小不能超过 5MB');
      }
    }
    const saved = await this.uploadService.saveFiles(files);
    return saved;
  }

  @ApiOperation({ summary: '文本敏感词检测' })
  @Auth()
  @Post('/check-text')
  async checkText(@Fields() fields: Record<string, any>) {
    const hits = await this.uploadService.checkSensitive(fields?.text || '');
    return { hits, passed: hits.length === 0 };
  }
}
