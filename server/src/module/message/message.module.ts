import { Controller, Get, Inject, Post, Provide, Query } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { ApiOperation, ApiTags } from '@midwayjs/swagger';
import { MessageEntity, HotKeywordEntity, SearchHistoryEntity } from '../../entity/platform.entity';
import { Auth, CurrentUserParam, CurrentUser } from '../../common/decorators';
import { PageResult } from '../../common/response';

/** 消息服务 */
@Provide()
export class MessageService {
  @InjectEntityModel(MessageEntity)
  messageRepo: Repository<MessageEntity>;

  async list(userId: number, msgType: string, page: number, pageSize: number): Promise<PageResult<MessageEntity>> {
    const where: any = { userId };
    if (msgType && msgType !== 'all') {
      where.msgType = msgType;
    }
    const [list, total] = await this.messageRepo.findAndCount({
      where,
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  async unreadCount(userId: number): Promise<number> {
    return this.messageRepo.countBy({ userId, isRead: 0 });
  }

  async markRead(userId: number, id?: number): Promise<boolean> {
    if (id) {
      await this.messageRepo.update({ id, userId }, { isRead: 1 });
    } else {
      await this.messageRepo.update({ userId, isRead: 0 }, { isRead: 1 });
    }
    return true;
  }

  /** 站内消息发送（订单状态、互动等业务调用） */
  async send(userId: number, msgType: string, title: string, content: string): Promise<void> {
    const msg = this.messageRepo.create({ userId, msgType, title, content });
    await this.messageRepo.save(msg);
  }
}

/** 搜索服务：热搜词 + 搜索历史 */
@Provide()
export class SearchService {
  @InjectEntityModel(HotKeywordEntity)
  hotRepo: Repository<HotKeywordEntity>;

  @InjectEntityModel(SearchHistoryEntity)
  historyRepo: Repository<SearchHistoryEntity>;

  async hotKeywords(): Promise<HotKeywordEntity[]> {
    return this.hotRepo.find({ order: { sort: 'ASC' }, take: 10 });
  }

  async history(userId: number): Promise<SearchHistoryEntity[]> {
    return this.historyRepo
      .createQueryBuilder('h')
      .where('h.userId = :userId', { userId })
      .orderBy('h.id', 'DESC')
      .take(10)
      .getMany();
  }

  async recordHistory(userId: number, keyword: string): Promise<void> {
    if (!keyword || !keyword.trim()) {
      return;
    }
    // 去重：删除旧记录再插入
    await this.historyRepo.delete({ userId, keyword });
    const row = this.historyRepo.create({ userId, keyword });
    await this.historyRepo.save(row);
  }

  async clearHistory(userId: number): Promise<boolean> {
    await this.historyRepo.delete({ userId });
    return true;
  }
}

@ApiTags(['公共-消息中心'])
@Controller('/api/messages')
export class MessageController {
  @Inject()
  messageService: MessageService;

  @ApiOperation({ summary: '消息列表（msgType: all/system/order/interact）' })
  @Auth()
  @Get('/')
  async list(
    @Query('msgType') msgType: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @CurrentUserParam() user: CurrentUser
  ) {
    return this.messageService.list(user.userId, msgType, Number(page), Number(pageSize));
  }

  @ApiOperation({ summary: '未读消息数' })
  @Auth()
  @Get('/unread-count')
  async unreadCount(@CurrentUserParam() user: CurrentUser) {
    return this.messageService.unreadCount(user.userId);
  }

  @ApiOperation({ summary: '标记已读（id 为空则全部已读）' })
  @Auth()
  @Post('/read')
  async markRead(@Query('id') id: number | undefined, @CurrentUserParam() user: CurrentUser) {
    return this.messageService.markRead(user.userId, id ? Number(id) : undefined);
  }
}

@ApiTags(['公共-搜索'])
@Controller('/api/search')
export class SearchController {
  @Inject()
  searchService: SearchService;

  @ApiOperation({ summary: '热搜词' })
  @Get('/hot')
  async hot() {
    return this.searchService.hotKeywords();
  }

  @ApiOperation({ summary: '我的搜索历史' })
  @Auth()
  @Get('/history')
  async history(@CurrentUserParam() user: CurrentUser) {
    return this.searchService.history(user.userId);
  }

  @ApiOperation({ summary: '记录搜索历史' })
  @Auth()
  @Post('/history')
  async record(@Query('keyword') keyword: string, @CurrentUserParam() user: CurrentUser) {
    return this.searchService.recordHistory(user.userId, keyword);
  }

  @ApiOperation({ summary: '清空搜索历史' })
  @Auth()
  @Post('/history/clear')
  async clear(@CurrentUserParam() user: CurrentUser) {
    return this.searchService.clearHistory(user.userId);
  }
}
