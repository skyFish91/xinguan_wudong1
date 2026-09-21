import { MessageService, SearchService } from '../src/module/message/message.module';
import { MessageEntity, HotKeywordEntity, SearchHistoryEntity } from '../src/entity/platform.entity';
import { repo, makeService } from './helpers/db';

/** 组装消息服务 */
function wireMessageService(): MessageService {
  const svc = makeService(MessageService);
  svc.messageRepo = repo(MessageEntity);
  return svc;
}

/** 组装搜索服务 */
function wireSearchService(): SearchService {
  const svc = makeService(SearchService);
  svc.hotRepo = repo(HotKeywordEntity);
  svc.historyRepo = repo(SearchHistoryEntity);
  return svc;
}

describe('MessageService 站内消息', () => {
  let svc: MessageService;

  beforeEach(() => {
    svc = wireMessageService();
  });

  it('发送消息并可分页读取', async () => {
    for (let i = 1; i <= 3; i++) {
      await svc.send(2, 'order', `消息${i}`, `内容${i}`);
    }
    const page = await svc.list(2, 'order', 1, 2);
    expect(page.total).toBe(3);
    expect(page.list).toHaveLength(2);
    expect(page.list[0].title).toBe('消息3');
  });

  it('按类型过滤', async () => {
    await svc.send(2, 'order', '订单消息', 'x');
    await svc.send(2, 'system', '系统消息', 'x');
    const page = await svc.list(2, 'system', 1, 10);
    expect(page.total).toBe(1);
    expect(page.list[0].title).toBe('系统消息');
  });

  it('未读数统计与单条已读', async () => {
    await svc.send(2, 'order', '消息1', 'x');
    await svc.send(2, 'order', '消息2', 'x');
    expect(await svc.unreadCount(2)).toBe(2);
    const page = await svc.list(2, 'all', 1, 10);
    await svc.markRead(2, page.list[0].id);
    expect(await svc.unreadCount(2)).toBe(1);
  });

  it('全部标记已读', async () => {
    await svc.send(2, 'order', '消息1', 'x');
    await svc.send(2, 'order', '消息2', 'x');
    await svc.markRead(2);
    expect(await svc.unreadCount(2)).toBe(0);
  });
});

describe('SearchService 搜索', () => {
  let svc: SearchService;

  beforeEach(() => {
    svc = wireSearchService();
  });

  it('热搜词按 sort 排序取前 10', async () => {
    for (let i = 1; i <= 12; i++) {
      await repo(HotKeywordEntity).save(
        repo(HotKeywordEntity).create({ keyword: `关键词${i}`, sort: i })
      );
    }
    const list = await svc.hotKeywords();
    expect(list).toHaveLength(10);
    expect(list[0].keyword).toBe('关键词1');
  });

  it('记录搜索历史并按时间倒序', async () => {
    await svc.recordHistory(2, '苗寨');
    await svc.recordHistory(2, '银饰');
    const history = await svc.history(2);
    expect(history.map(h => h.keyword)).toEqual(['银饰', '苗寨']);
  });

  it('重复关键词去重置顶', async () => {
    await svc.recordHistory(2, '苗寨');
    await svc.recordHistory(2, '银饰');
    await svc.recordHistory(2, '苗寨');
    const history = await svc.history(2);
    expect(history.map(h => h.keyword)).toEqual(['苗寨', '银饰']);
  });

  it('空关键词不记录', async () => {
    await svc.recordHistory(2, '   ');
    expect(await svc.history(2)).toHaveLength(0);
  });

  it('清空搜索历史', async () => {
    await svc.recordHistory(2, '苗寨');
    await svc.clearHistory(2);
    expect(await svc.history(2)).toHaveLength(0);
  });
});
