import { CommunityService } from '../src/module/community/community.module';
import { UploadService } from '../src/module/upload/upload.module';
import { PostEntity, CommentEntity, TopicEntity, FollowEntity, ReportEntity } from '../src/entity/community.entity';
import { LikeEntity, FavoriteEntity } from '../src/entity/interaction.entity';
import { UserEntity } from '../src/entity/user.entity';
import { SensitiveWordEntity } from '../src/entity/platform.entity';
import { repo, makeService } from './helpers/db';

/** 组装 CommunityService：真实仓库 + 真实敏感词检测 */
function wireCommunityService(): CommunityService {
  const svc = makeService(CommunityService);
  svc.postRepo = repo(PostEntity);
  svc.commentRepo = repo(CommentEntity);
  svc.topicRepo = repo(TopicEntity);
  svc.followRepo = repo(FollowEntity);
  svc.reportRepo = repo(ReportEntity);
  svc.likeRepo = repo(LikeEntity);
  svc.favoriteRepo = repo(FavoriteEntity);
  svc.userRepo = repo(UserEntity);
  const upload = makeService(UploadService);
  upload.sensitiveRepo = repo(SensitiveWordEntity);
  svc.uploadService = upload;
  return svc;
}

/** 造用户 */
async function seedUser(id: number, nickname = '用户') {
  return repo(UserEntity).save(
    repo(UserEntity).create({ id, phone: `1380000000${id}`, password: 'hash', nickname })
  );
}

/** 造敏感词 */
async function seedSensitive(word: string) {
  return repo(SensitiveWordEntity).save(repo(SensitiveWordEntity).create({ word }));
}

/** 直接发布一篇已过审游记 */
async function seedPost(userId: number, title = '苗寨游记') {
  return repo(PostEntity).save(
    repo(PostEntity).create({ userId, title, content: '内容', images: '[]', status: 1, publishedAt: new Date() })
  );
}

describe('CommunityService 社区', () => {
  let svc: CommunityService;

  beforeEach(() => {
    svc = wireCommunityService();
  });

  describe('createPost 发布', () => {
    it('无敏感词直接过审并关联话题计数', async () => {
      await seedUser(2);
      const topic = await repo(TopicEntity).save(repo(TopicEntity).create({ name: '苗寨风光' }));
      const post = await svc.createPost(2, { title: '乌东村游记', content: '风景很美', topicId: topic.id });
      expect(post.status).toBe(1);
      expect(post.needAudit).toBe(false);
      expect(post.publishedAt).not.toBeNull();
      const after = await repo(TopicEntity).findOneBy({ id: topic.id });
      expect(after!.postCount).toBe(1);
    });

    it('敏感词命中转人工审核并返回命中词', async () => {
      await seedUser(2);
      await seedSensitive('赌博');
      const post = await svc.createPost(2, { title: '游记', content: '这里有人赌博' });
      expect(post.status).toBe(0);
      expect(post.needAudit).toBe(true);
      expect(post.sensitiveHits).toEqual(['赌博']);
      expect(post.publishedAt).toBeNull();
    });
  });

  describe('postList 游记流', () => {
    it('只返回已过审游记并附加作者信息', async () => {
      const author = await seedUser(2, '阿晶');
      await seedPost(author.id);
      // 未过审的不应出现
      await repo(PostEntity).save(repo(PostEntity).create({ userId: author.id, title: '待审', content: 'x', status: 0 }));
      const page = await svc.postList({ page: 1, pageSize: 10 });
      expect(page.total).toBe(1);
      expect(page.list[0].author.nickname).toBe('阿晶');
    });

    it('热榜按互动度排序', async () => {
      await seedUser(2);
      const a = await seedPost(2, 'A');
      const b = await seedPost(2, 'B');
      await repo(PostEntity).update(a.id, { likeCount: 1, commentCount: 0, viewCount: 0 });
      await repo(PostEntity).update(b.id, { likeCount: 0, commentCount: 3, viewCount: 10 });
      const page = await svc.postList({ tab: 'hot', page: 1, pageSize: 10 });
      expect(page.list[0].id).toBe(b.id);
    });

    it('话题筛选', async () => {
      await seedUser(2);
      const topic = await repo(TopicEntity).save(repo(TopicEntity).create({ name: '美食' }));
      await seedPost(2);
      const inTopic = await seedPost(2, '美食帖');
      await repo(PostEntity).update(inTopic.id, { topicId: topic.id });
      const page = await svc.postList({ topicId: topic.id, page: 1, pageSize: 10 });
      expect(page.total).toBe(1);
      expect(page.list[0].title).toBe('美食帖');
    });

    it('关注流只显示已关注用户的游记', async () => {
      await seedUser(2);
      const author = await seedUser(3);
      await seedPost(author.id);
      await repo(FollowEntity).save(repo(FollowEntity).create({ userId: 2, followUserId: 3 }));
      const page = await svc.postList({ userId: 2, tab: 'follow', page: 1, pageSize: 10 });
      expect(page.total).toBe(1);
    });
  });

  describe('postDetail 详情', () => {
    it('浏览数 +1 并返回互动状态', async () => {
      await seedUser(2);
      const post = await seedPost(2);
      await svc.toggleLike(2, 'post', post.id);
      await svc.togglePostFavorite(2, post.id);
      const detail = await svc.postDetail(post.id, 2);
      expect(detail.viewCount).toBe(1);
      expect(detail.liked).toBe(true);
      expect(detail.favorited).toBe(true);
    });

    it('未过审或不存在抛 3005', async () => {
      await expect(svc.postDetail(999)).rejects.toMatchObject({ code: 3005 });
    });
  });

  describe('deletePost 删除', () => {
    it('删除游记并清理评论与话题计数', async () => {
      await seedUser(2);
      const topic = await repo(TopicEntity).save(repo(TopicEntity).create({ name: '美食', postCount: 1 }));
      const post = await repo(PostEntity).save(
        repo(PostEntity).create({ userId: 2, title: 'x', content: 'y', status: 1, topicId: topic.id })
      );
      await repo(CommentEntity).save(repo(CommentEntity).create({ postId: post.id, userId: 2, content: '评论' }));
      await svc.deletePost(2, post.id);
      expect(await repo(PostEntity).count()).toBe(0);
      expect(await repo(CommentEntity).count()).toBe(0);
      expect((await repo(TopicEntity).findOneBy({ id: topic.id }))!.postCount).toBe(0);
    });

    it('删除他人游记抛 3005', async () => {
      await seedUser(2);
      const post = await seedPost(2);
      await expect(svc.deletePost(3, post.id)).rejects.toMatchObject({ code: 3005 });
    });
  });

  describe('comment 评论', () => {
    it('一级评论过审并累计评论数', async () => {
      await seedUser(2);
      const post = await seedPost(2);
      const comment = await svc.createComment(2, post.id, { content: '真不错' });
      expect(comment.status).toBe(1);
      expect(comment.needAudit).toBe(false);
      expect((await repo(PostEntity).findOneBy({ id: post.id }))!.commentCount).toBe(1);
    });

    it('二级回复记录被回复人', async () => {
      await seedUser(2);
      await seedUser(3);
      const post = await seedPost(2);
      const root = await svc.createComment(2, post.id, { content: '根评论' });
      const reply = await svc.createComment(3, post.id, { content: '回复你', parentId: root.id });
      expect(reply.replyUserId).toBe(2);
    });

    it('敏感词评论自动隐藏且不计数', async () => {
      await seedUser(2);
      await seedSensitive('骗子');
      const post = await seedPost(2);
      const comment = await svc.createComment(2, post.id, { content: '小心骗子' });
      expect(comment.status).toBe(0);
      expect(comment.needAudit).toBe(true);
      expect((await repo(PostEntity).findOneBy({ id: post.id }))!.commentCount).toBe(0);
    });

    it('父评论不存在抛 3005', async () => {
      await seedUser(2);
      const post = await seedPost(2);
      await expect(svc.createComment(2, post.id, { content: 'x', parentId: 999 })).rejects.toMatchObject({ code: 3005 });
    });

    it('评论列表两级结构', async () => {
      await seedUser(2);
      const post = await seedPost(2);
      const root = await svc.createComment(2, post.id, { content: '根评论' });
      await svc.createComment(2, post.id, { content: '子评论', parentId: root.id });
      const list = await svc.commentList(post.id);
      expect(list).toHaveLength(1);
      expect(list[0].replies).toHaveLength(1);
      expect(list[0].replies[0].content).toBe('子评论');
    });
  });

  describe('toggleLike 点赞', () => {
    it('点赞游记再取消', async () => {
      await seedUser(2);
      const post = await seedPost(2);
      expect((await svc.toggleLike(2, 'post', post.id)).liked).toBe(true);
      expect((await repo(PostEntity).findOneBy({ id: post.id }))!.likeCount).toBe(1);
      expect((await svc.toggleLike(2, 'post', post.id)).liked).toBe(false);
      expect((await repo(PostEntity).findOneBy({ id: post.id }))!.likeCount).toBe(0);
    });

    it('点赞评论', async () => {
      await seedUser(2);
      const post = await seedPost(2);
      const comment = await svc.createComment(2, post.id, { content: '好' });
      await svc.toggleLike(2, 'comment', comment.id);
      expect((await repo(CommentEntity).findOneBy({ id: comment.id }))!.likeCount).toBe(1);
    });

    it('点赞不存在的游记抛 3005', async () => {
      await expect(svc.toggleLike(2, 'post', 999)).rejects.toMatchObject({ code: 3005 });
    });
  });

  describe('收藏与关注', () => {
    it('收藏游记并出现在我的收藏', async () => {
      await seedUser(2);
      const post = await seedPost(2);
      await svc.togglePostFavorite(2, post.id);
      const favorites = await svc.myFavoritePosts(2);
      expect(favorites).toHaveLength(1);
      expect(favorites[0].id).toBe(post.id);
      await svc.togglePostFavorite(2, post.id);
      expect(await svc.myFavoritePosts(2)).toHaveLength(0);
    });

    it('关注用户再取关', async () => {
      await seedUser(2);
      await seedUser(3);
      expect((await svc.toggleFollow(2, 3)).followed).toBe(true);
      expect((await svc.toggleFollow(2, 3)).followed).toBe(false);
    });

    it('不能关注自己抛 2001', async () => {
      await seedUser(2);
      await expect(svc.toggleFollow(2, 2)).rejects.toMatchObject({ code: 2001 });
    });

    it('关注不存在的用户抛 3005', async () => {
      await expect(svc.toggleFollow(2, 999)).rejects.toMatchObject({ code: 3005 });
    });
  });

  describe('话题关注', () => {
    it('关注话题累计人数', async () => {
      await seedUser(2);
      const topic = await repo(TopicEntity).save(repo(TopicEntity).create({ name: '苗寨风光' }));
      expect((await svc.toggleTopicFollow(2, topic.id)).followed).toBe(true);
      expect((await repo(TopicEntity).findOneBy({ id: topic.id }))!.followCount).toBe(1);
      expect((await svc.toggleTopicFollow(2, topic.id)).followed).toBe(false);
      expect((await repo(TopicEntity).findOneBy({ id: topic.id }))!.followCount).toBe(0);
    });

    it('话题不存在抛 3005', async () => {
      await expect(svc.toggleTopicFollow(2, 999)).rejects.toMatchObject({ code: 3005 });
    });
  });

  describe('createReport 举报', () => {
    it('举报成功', async () => {
      await seedUser(2);
      const report = await svc.createReport(2, { targetType: 'post', targetId: 1, reason: '广告' });
      expect(report.status).toBe(0);
    });

    it('重复举报抛 3001', async () => {
      await seedUser(2);
      await svc.createReport(2, { targetType: 'post', targetId: 1, reason: '广告' });
      await expect(svc.createReport(2, { targetType: 'post', targetId: 1, reason: '还是广告' })).rejects.toMatchObject({ code: 3001 });
    });

    it('非法举报类型抛 2001', async () => {
      await expect(svc.createReport(2, { targetType: 'user', targetId: 1, reason: 'x' } as any)).rejects.toMatchObject({ code: 2001 });
    });
  });
});
