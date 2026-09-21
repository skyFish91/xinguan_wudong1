import { Body, Controller, Get, Inject, Param, Post, Provide, Query } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository, In } from 'typeorm';
import { ApiOperation, ApiTags } from '@midwayjs/swagger';
import {
  PostEntity,
  CommentEntity,
  TopicEntity,
  TopicFollowEntity,
  FollowEntity,
  ReportEntity,
} from '../../entity/community.entity';
import { LikeEntity, FavoriteEntity } from '../../entity/interaction.entity';
import { UserEntity } from '../../entity/user.entity';
import { UploadService } from '../upload/upload.module';
import { Auth, CurrentUserParam, CurrentUser } from '../../common/decorators';
import { BizError } from '../../common/BizError';
import { IsNotEmpty, MaxLength } from 'class-validator';

/** 发布游记 DTO */
export class PostDTO {
  @IsNotEmpty({ message: '标题不能为空' })
  @MaxLength(200, { message: '标题过长' })
  title: string;
  @IsNotEmpty({ message: '内容不能为空' })
  content: string;
  /** 图片 JSON 数组 */
  images?: string;
  videoUrl?: string;
  /** 关联对象：product/restaurant/homestay/route */
  linkedType?: string;
  linkedId?: number;
  linkedName?: string;
  topicId?: number;
}

/** 发表评论 DTO */
export class CommentDTO {
  @IsNotEmpty({ message: '评论内容不能为空' })
  @MaxLength(500, { message: '评论过长' })
  content: string;
  /** 二级回复父评论 */
  parentId?: number;
}

/** 举报 DTO */
export class ReportDTO {
  @IsNotEmpty({ message: '举报对象不能为空' })
  targetType: string;
  @IsNotEmpty({ message: '举报对象不能为空' })
  targetId: number;
  @IsNotEmpty({ message: '举报原因不能为空' })
  reason: string;
}

/** 模块五 社区：照片分享 */
@Provide()
export class CommunityService {
  @InjectEntityModel(PostEntity)
  postRepo: Repository<PostEntity>;

  @InjectEntityModel(CommentEntity)
  commentRepo: Repository<CommentEntity>;

  @InjectEntityModel(TopicEntity)
  topicRepo: Repository<TopicEntity>;

  @InjectEntityModel(TopicFollowEntity)
  topicFollowRepo: Repository<TopicFollowEntity>;

  @InjectEntityModel(FollowEntity)
  followRepo: Repository<FollowEntity>;

  @InjectEntityModel(ReportEntity)
  reportRepo: Repository<ReportEntity>;

  @InjectEntityModel(LikeEntity)
  likeRepo: Repository<LikeEntity>;

  @InjectEntityModel(FavoriteEntity)
  favoriteRepo: Repository<FavoriteEntity>;

  @InjectEntityModel(UserEntity)
  userRepo: Repository<UserEntity>;

  @Inject()
  uploadService: UploadService;

  /** 话题列表（含推荐置顶） */
  async topicList() {
    const topics = await this.topicRepo.find({ order: { isRecommend: 'DESC', followCount: 'DESC' } });
    return topics;
  }

  /** 关注/取关话题 */
  async toggleTopicFollow(userId: number, topicId: number) {
    const topic = await this.topicRepo.findOneBy({ id: topicId });
    if (!topic) {
      throw BizError.notFound('话题不存在');
    }
    const exists = await this.topicFollowRepo.findOneBy({ userId, topicId });
    if (exists) {
      await this.topicFollowRepo.delete(exists.id);
      topic.followCount = Math.max(0, topic.followCount - 1);
      await this.topicRepo.save(topic);
      return { followed: false };
    }
    await this.topicFollowRepo.save(this.topicFollowRepo.create({ userId, topicId }));
    topic.followCount += 1;
    await this.topicRepo.save(topic);
    return { followed: true };
  }

  /** 发布游记（含敏感词检测：命中转人工审核） */
  async createPost(userId: number, dto: PostDTO) {
    const hits = await this.uploadService.checkSensitive(`${dto.title} ${dto.content}`);
    const post = this.postRepo.create({
      userId,
      title: dto.title,
      content: dto.content,
      images: dto.images || '[]',
      videoUrl: dto.videoUrl || '',
      linkedType: dto.linkedType || '',
      linkedId: dto.linkedId || null,
      linkedName: dto.linkedName || '',
      topicId: dto.topicId || null,
      status: hits.length > 0 ? 0 : 1,
      rejectReason: '',
      publishedAt: hits.length > 0 ? null : new Date(),
    });
    const saved = await this.postRepo.save(post);
    if (dto.topicId) {
      await this.topicRepo.increment({ id: dto.topicId }, 'postCount', 1);
    }
    return { ...saved, needAudit: hits.length > 0, sensitiveHits: hits };
  }

  /** 游记流（feed=all/hot/follow，topicId 筛选） */
  async postList(params: {
    userId?: number;
    tab?: string;
    topicId?: number;
    page: number;
    pageSize: number;
  }) {
    const qb = this.postRepo.createQueryBuilder('p').where('p.status = 1');
    if (params.topicId) {
      qb.andWhere('p.topic_id = :topicId', { topicId: params.topicId });
    }
    if (params.tab === 'follow') {
      const followQb = this.followRepo
        .createQueryBuilder('f')
        .select('f.follow_user_id')
        .where('f.user_id = :uid');
      qb.andWhere(`p.user_id IN (${followQb.getQuery()})`);
      qb.setParameter('uid', params.userId || 0);
    }
    if (params.tab === 'hot') {
      qb.orderBy('p.likeCount + p.commentCount * 2 + p.viewCount', 'DESC');
    } else {
      qb.orderBy('p.id', 'DESC');
    }
    const [posts, total] = await qb
      .skip((params.page - 1) * params.pageSize)
      .take(params.pageSize)
      .getManyAndCount();
    return { list: await this.decoratePosts(posts, params.userId), total, page: params.page, pageSize: params.pageSize };
  }

  /** 批量附加作者信息 */
  private async decoratePosts(posts: PostEntity[], userId?: number) {
    if (posts.length === 0) {
      return [];
    }
    const userIds = [...new Set(posts.map(p => p.userId))];
    const users = await this.userRepo.findBy({ id: In(userIds as number[]) });
    const userMap = new Map(users.map(u => [u.id, { id: u.id, nickname: u.nickname, avatar: u.avatar }]));
    return posts.map(p => ({ ...p, author: userMap.get(p.userId) || null }));
  }

  /** 游记详情（浏览数 +1，含互动状态） */
  async postDetail(id: number, userId?: number) {
    const post = await this.postRepo.findOneBy({ id, status: 1 });
    if (!post) {
      throw BizError.notFound('游记不存在或未过审');
    }
    await this.postRepo.increment({ id }, 'viewCount', 1);
    post.viewCount += 1;
    const author = await this.userRepo.findOneBy({ id: post.userId });
    const liked = userId
      ? !!(await this.likeRepo.findOneBy({ userId, targetType: 'post', targetId: id }))
      : false;
    const favorited = userId
      ? !!(await this.favoriteRepo.findOneBy({ userId, bizType: 'post', bizId: id }))
      : false;
    const followed = userId
      ? !!(await this.followRepo.findOneBy({ userId, followUserId: post.userId }))
      : false;
    const topic = post.topicId ? await this.topicRepo.findOneBy({ id: post.topicId }) : null;
    return {
      ...post,
      author: author ? { id: author.id, nickname: author.nickname, avatar: author.avatar, bio: author.bio } : null,
      topic,
      liked,
      favorited,
      followed,
    };
  }

  /** 我的游记（含未过审） */
  async myPosts(userId: number) {
    const posts = await this.postRepo.find({ where: { userId }, order: { id: 'DESC' } });
    return this.decoratePosts(posts);
  }

  /** 删除自己的游记（同时清理互动数据） */
  async deletePost(userId: number, id: number) {
    const post = await this.postRepo.findOneBy({ id, userId });
    if (!post) {
      throw BizError.notFound('游记不存在');
    }
    await this.postRepo.delete(id);
    await this.commentRepo.delete({ postId: id });
    if (post.topicId) {
      await this.topicRepo.decrement({ id: post.topicId }, 'postCount', 1);
    }
    return true;
  }

  /** 评论列表（两级结构） */
  async commentList(postId: number) {
    const roots = await this.commentRepo.find({
      where: { postId, parentId: 0, status: 1 },
      order: { id: 'ASC' },
    });
    const children = await this.commentRepo.find({
      where: { postId, status: 1 },
      order: { id: 'ASC' },
    });
    const userIds = [...new Set(children.map(c => c.userId))];
    const users = await this.userRepo.findBy({ id: In(userIds as number[]) });
    const userMap = new Map(users.map(u => [u.id, { id: u.id, nickname: u.nickname, avatar: u.avatar }]));
    const mapComment = (c: CommentEntity) => ({
      ...c,
      user: userMap.get(c.userId) || null,
      replyTo: c.replyUserId ? userMap.get(c.replyUserId) || null : null,
    });
    return roots.map(r => ({
      ...mapComment(r),
      replies: children.filter(c => c.parentId === r.id).map(mapComment),
    }));
  }

  /** 发表评论/二级回复（敏感词命中自动隐藏） */
  async createComment(userId: number, postId: number, dto: CommentDTO) {
    const post = await this.postRepo.findOneBy({ id: postId, status: 1 });
    if (!post) {
      throw BizError.notFound('游记不存在');
    }
    const hits = await this.uploadService.checkSensitive(dto.content);
    let replyUserId: number | null = null;
    let parentId = dto.parentId || 0;
    if (parentId) {
      const parent = await this.commentRepo.findOneBy({ id: parentId, postId });
      if (!parent) {
        throw BizError.notFound('父评论不存在');
      }
      replyUserId = parent.userId;
    }
    const comment = await this.commentRepo.save(
      this.commentRepo.create({
        postId,
        userId,
        content: dto.content,
        parentId,
        replyUserId,
        status: hits.length > 0 ? 0 : 1,
      })
    );
    if (hits.length === 0) {
      await this.postRepo.increment({ id: postId }, 'commentCount', 1);
    }
    return { ...comment, needAudit: hits.length > 0 };
  }

  /** 删除自己的评论 */
  async deleteComment(userId: number, id: number) {
    const comment = await this.commentRepo.findOneBy({ id, userId });
    if (!comment) {
      throw BizError.notFound('评论不存在');
    }
    await this.commentRepo.delete(id);
    if (comment.status === 1) {
      const children = await this.commentRepo.countBy({ parentId: id });
      await this.postRepo.decrement({ id: comment.postId }, 'commentCount', 1 + children);
    }
    return true;
  }

  /** 点赞/取消点赞（post/comment） */
  async toggleLike(userId: number, targetType: string, targetId: number) {
    const exists = await this.likeRepo.findOneBy({ userId, targetType, targetId });
    if (exists) {
      await this.likeRepo.delete(exists.id);
      if (targetType === 'post') {
        await this.postRepo.decrement({ id: targetId }, 'likeCount', 1);
      } else {
        await this.commentRepo.decrement({ id: targetId }, 'likeCount', 1);
      }
      return { liked: false };
    }
    if (targetType === 'post') {
      const post = await this.postRepo.findOneBy({ id: targetId, status: 1 });
      if (!post) {
        throw BizError.notFound('游记不存在');
      }
    } else {
      const comment = await this.commentRepo.findOneBy({ id: targetId, status: 1 });
      if (!comment) {
        throw BizError.notFound('评论不存在');
      }
    }
    await this.likeRepo.save(this.likeRepo.create({ userId, targetType, targetId }));
    if (targetType === 'post') {
      await this.postRepo.increment({ id: targetId }, 'likeCount', 1);
    } else {
      await this.commentRepo.increment({ id: targetId }, 'likeCount', 1);
    }
    return { liked: true };
  }

  /** 收藏/取消收藏游记 */
  async togglePostFavorite(userId: number, postId: number) {
    const post = await this.postRepo.findOneBy({ id: postId, status: 1 });
    if (!post) {
      throw BizError.notFound('游记不存在');
    }
    const exists = await this.favoriteRepo.findOneBy({ userId, bizType: 'post', bizId: postId });
    if (exists) {
      await this.favoriteRepo.delete(exists.id);
      await this.postRepo.decrement({ id: postId }, 'favoriteCount', 1);
      return { favorited: false };
    }
    await this.favoriteRepo.save(this.favoriteRepo.create({ userId, bizType: 'post', bizId: postId }));
    await this.postRepo.increment({ id: postId }, 'favoriteCount', 1);
    return { favorited: true };
  }

  /** 我收藏的游记 */
  async myFavoritePosts(userId: number) {
    const favorites = await this.favoriteRepo.find({
      where: { userId, bizType: 'post' },
      order: { id: 'DESC' },
    });
    const ids = favorites.map(f => f.bizId);
    if (ids.length === 0) {
      return [];
    }
    const posts = await this.postRepo.findBy({ id: In(ids), status: 1 });
    return this.decoratePosts(posts);
  }

  /** 关注/取关用户 */
  async toggleFollow(userId: number, followUserId: number) {
    if (userId === followUserId) {
      throw BizError.param('不能关注自己');
    }
    const target = await this.userRepo.findOneBy({ id: followUserId });
    if (!target) {
      throw BizError.notFound('用户不存在');
    }
    const exists = await this.followRepo.findOneBy({ userId, followUserId });
    if (exists) {
      await this.followRepo.delete(exists.id);
      return { followed: false };
    }
    await this.followRepo.save(this.followRepo.create({ userId, followUserId }));
    return { followed: true };
  }

  /** 举报 */
  async createReport(userId: number, dto: ReportDTO) {
    if (!['post', 'comment'].includes(dto.targetType)) {
      throw BizError.param('举报对象类型无效');
    }
    const dup = await this.reportRepo.findOneBy({
      reportUserId: userId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      status: 0,
    });
    if (dup) {
      throw BizError.biz('您已举报过该内容，请等待处理');
    }
    return this.reportRepo.save(
      this.reportRepo.create({ reportUserId: userId, ...dto, status: 0, handleNote: '' })
    );
  }
}

@ApiTags(['模块五-社区-照片分享'])
@Controller('/api/community')
export class CommunityController {
  @Inject()
  communityService: CommunityService;

  @ApiOperation({ summary: '话题列表' })
  @Get('/topics')
  async topics() {
    return this.communityService.topicList();
  }

  @ApiOperation({ summary: '关注/取关话题' })
  @Auth()
  @Post('/topics/:id/follow')
  async followTopic(@Param('id') id: number, @CurrentUserParam() user: CurrentUser) {
    return this.communityService.toggleTopicFollow(user.userId, Number(id));
  }

  @ApiOperation({ summary: '发布游记（敏感词自动转审核）' })
  @Auth()
  @Post('/posts')
  async publish(@Body() dto: PostDTO, @CurrentUserParam() user: CurrentUser) {
    return this.communityService.createPost(user.userId, dto);
  }

  @ApiOperation({ summary: '游记流（tab=all/hot/follow，topicId 筛选）' })
  @Get('/posts')
  async posts(
    @Query('tab') tab: string,
    @Query('topicId') topicId: number | undefined,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @CurrentUserParam() user?: CurrentUser
  ) {
    return this.communityService.postList({
      userId: user?.userId,
      tab: tab || 'all',
      topicId: topicId ? Number(topicId) : undefined,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @ApiOperation({ summary: '游记详情（浏览数+1，含互动状态）' })
  @Get('/posts/:id')
  async detail(@Param('id') id: number, @CurrentUserParam() user?: CurrentUser) {
    return this.communityService.postDetail(Number(id), user?.userId);
  }

  @ApiOperation({ summary: '我的游记' })
  @Auth()
  @Get('/my/posts')
  async myPosts(@CurrentUserParam() user: CurrentUser) {
    return this.communityService.myPosts(user.userId);
  }

  @ApiOperation({ summary: '删除自己的游记' })
  @Auth()
  @Post('/my/posts/:id/delete')
  async deletePost(@Param('id') id: number, @CurrentUserParam() user: CurrentUser) {
    return this.communityService.deletePost(user.userId, Number(id));
  }

  @ApiOperation({ summary: '评论列表（两级）' })
  @Get('/posts/:id/comments')
  async comments(@Param('id') id: number) {
    return this.communityService.commentList(Number(id));
  }

  @ApiOperation({ summary: '发表评论/二级回复' })
  @Auth()
  @Post('/posts/:id/comments')
  async comment(@Param('id') id: number, @Body() dto: CommentDTO, @CurrentUserParam() user: CurrentUser) {
    return this.communityService.createComment(user.userId, Number(id), dto);
  }

  @ApiOperation({ summary: '删除自己的评论' })
  @Auth()
  @Post('/comments/:id/delete')
  async deleteComment(@Param('id') id: number, @CurrentUserParam() user: CurrentUser) {
    return this.communityService.deleteComment(user.userId, Number(id));
  }

  @ApiOperation({ summary: '点赞/取消点赞（targetType=post/comment）' })
  @Auth()
  @Post('/like')
  async like(
    @Body('targetType') targetType: string,
    @Body('targetId') targetId: number,
    @CurrentUserParam() user: CurrentUser
  ) {
    return this.communityService.toggleLike(user.userId, targetType, Number(targetId));
  }

  @ApiOperation({ summary: '收藏/取消收藏游记' })
  @Auth()
  @Post('/posts/:id/favorite')
  async favorite(@Param('id') id: number, @CurrentUserParam() user: CurrentUser) {
    return this.communityService.togglePostFavorite(user.userId, Number(id));
  }

  @ApiOperation({ summary: '我收藏的游记' })
  @Auth()
  @Get('/my/favorites')
  async myFavorites(@CurrentUserParam() user: CurrentUser) {
    return this.communityService.myFavoritePosts(user.userId);
  }

  @ApiOperation({ summary: '关注/取关用户' })
  @Auth()
  @Post('/follow')
  async follow(@Body('followUserId') followUserId: number, @CurrentUserParam() user: CurrentUser) {
    return this.communityService.toggleFollow(user.userId, Number(followUserId));
  }

  @ApiOperation({ summary: '举报内容' })
  @Auth()
  @Post('/reports')
  async report(@Body() dto: ReportDTO, @CurrentUserParam() user: CurrentUser) {
    return this.communityService.createReport(user.userId, dto);
  }
}
