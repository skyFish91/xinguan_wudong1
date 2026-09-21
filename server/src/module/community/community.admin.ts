import { Body, Controller, Get, Inject, Param, Post, Provide, Query } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository, In } from 'typeorm';
import { ApiOperation, ApiTags } from '@midwayjs/swagger';
import { PostEntity, CommentEntity, TopicEntity, ReportEntity } from '../../entity/community.entity';
import { UserEntity } from '../../entity/user.entity';
import { Auth } from '../../common/decorators';
import { BizError } from '../../common/BizError';
import dayjs from 'dayjs';

/** 模块五 社区：平台内容审核后台 */
@Provide()
export class CommunityAdminService {
  @InjectEntityModel(PostEntity)
  postRepo: Repository<PostEntity>;

  @InjectEntityModel(CommentEntity)
  commentRepo: Repository<CommentEntity>;

  @InjectEntityModel(TopicEntity)
  topicRepo: Repository<TopicEntity>;

  @InjectEntityModel(ReportEntity)
  reportRepo: Repository<ReportEntity>;

  @InjectEntityModel(UserEntity)
  userRepo: Repository<UserEntity>;

  /** 帖子列表（status=-1 全部，0 待审，1 已发布，2 已驳回） */
  async postList(status: number | undefined, keyword: string, page: number, pageSize: number) {
    const qb = this.postRepo.createQueryBuilder('p');
    if (status !== undefined && status >= 0) {
      qb.where('p.status = :status', { status });
    }
    if (keyword) {
      qb.andWhere('(p.title LIKE :kw OR p.content LIKE :kw)', { kw: `%${keyword}%` });
    }
    const [posts, total] = await qb
      .orderBy('p.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    if (posts.length === 0) {
      return { list: [], total, page, pageSize };
    }
    const users = await this.userRepo.findBy({ id: In([...new Set(posts.map(p => p.userId))] as number[]) });
    const userMap = new Map(users.map(u => [u.id, { id: u.id, nickname: u.nickname, avatar: u.avatar }]));
    return {
      list: posts.map(p => ({ ...p, author: userMap.get(p.userId) || null })),
      total,
      page,
      pageSize,
    };
  }

  /** 审核游记：pass=true 发布，否则驳回并记录原因 */
  async auditPost(id: number, pass: boolean, reason: string) {
    const post = await this.postRepo.findOneBy({ id });
    if (!post) {
      throw BizError.notFound('游记不存在');
    }
    post.status = pass ? 1 : 2;
    post.rejectReason = pass ? '' : reason || '内容不符合社区规范';
    if (pass && !post.publishedAt) {
      post.publishedAt = new Date();
    }
    return this.postRepo.save(post);
  }

  /** 热门加精 toggle */
  async toggleHot(id: number) {
    const post = await this.postRepo.findOneBy({ id });
    if (!post) {
      throw BizError.notFound('游记不存在');
    }
    post.isHot = post.isHot === 1 ? 0 : 1;
    return this.postRepo.save(post);
  }

  /** 下架/删除游记 */
  async deletePost(id: number) {
    const post = await this.postRepo.findOneBy({ id });
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

  /** 评论列表 */
  async commentList(postId: number | undefined, status: number | undefined, page: number, pageSize: number) {
    const qb = this.commentRepo.createQueryBuilder('c');
    if (postId) {
      qb.where('c.post_id = :postId', { postId });
    }
    if (status !== undefined && status >= 0) {
      qb.andWhere('c.status = :status', { status });
    }
    const [comments, total] = await qb
      .orderBy('c.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    if (comments.length === 0) {
      return { list: [], total, page, pageSize };
    }
    const users = await this.userRepo.findBy({ id: In([...new Set(comments.map(c => c.userId))] as number[]) });
    const userMap = new Map(users.map(u => [u.id, { id: u.id, nickname: u.nickname, avatar: u.avatar }]));
    return {
      list: comments.map(c => ({ ...c, user: userMap.get(c.userId) || null })),
      total,
      page,
      pageSize,
    };
  }

  /** 删除/恢复评论 */
  async toggleCommentStatus(id: number, status: number) {
    const comment = await this.commentRepo.findOneBy({ id });
    if (!comment) {
      throw BizError.notFound('评论不存在');
    }
    comment.status = status;
    return this.commentRepo.save(comment);
  }

  /** 举报列表 */
  async reportList(status: number | undefined, page: number, pageSize: number) {
    const qb = this.reportRepo.createQueryBuilder('r');
    if (status !== undefined && status >= 0) {
      qb.where('r.status = :status', { status });
    }
    const [reports, total] = await qb
      .orderBy('r.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    if (reports.length === 0) {
      return { list: [], total, page, pageSize };
    }
    const users = await this.userRepo.findBy({ id: In([...new Set(reports.map(r => r.reportUserId))] as number[]) });
    const userMap = new Map(users.map(u => [u.id, u.nickname]));
    return {
      list: reports.map(r => ({ ...r, reporter: userMap.get(r.reportUserId) || '' })),
      total,
      page,
      pageSize,
    };
  }

  /** 处理举报：takeDown=true 下架目标内容，否则忽略 */
  async handleReport(id: number, takeDown: boolean, note: string) {
    const report = await this.reportRepo.findOneBy({ id, status: 0 });
    if (!report) {
      throw BizError.biz('举报不存在或已处理');
    }
    if (takeDown) {
      if (report.targetType === 'post') {
        await this.postRepo.update({ id: report.targetId }, { status: 2, rejectReason: '被举报下架' });
      } else {
        await this.commentRepo.update({ id: report.targetId }, { status: 0 });
      }
    }
    report.status = 1;
    report.handleNote = note || (takeDown ? '已下架目标内容' : '举报不成立，已忽略');
    await this.reportRepo.save(report);
    return true;
  }

  /** 话题管理：新增/编辑/推荐 */
  async saveTopic(dto: any) {
    if (dto.id) {
      const topic = await this.topicRepo.findOneBy({ id: dto.id });
      if (!topic) {
        throw BizError.notFound('话题不存在');
      }
      Object.assign(topic, dto);
      return this.topicRepo.save(topic);
    }
    return this.topicRepo.save(this.topicRepo.create(dto as Partial<TopicEntity>));
  }

  /** 删除话题 */
  async deleteTopic(id: number) {
    const topic = await this.topicRepo.findOneBy({ id });
    if (!topic) {
      throw BizError.notFound('话题不存在');
    }
    await this.topicRepo.delete(id);
    return true;
  }

  /** 社区统计 */
  async stats() {
    const today = dayjs().format('YYYY-MM-DD 00:00:00');
    return {
      postCount: await this.postRepo.count(),
      pendingPosts: await this.postRepo.countBy({ status: 0 }),
      todayPosts: await this.postRepo
        .createQueryBuilder('p')
        .where('p.created_at >= :today', { today })
        .getCount(),
      commentCount: await this.commentRepo.count(),
      topicCount: await this.topicRepo.count(),
      pendingReports: await this.reportRepo.countBy({ status: 0 }),
    };
  }
}

@ApiTags(['平台后台-社区审核'])
@Controller('/api/admin/community')
export class CommunityAdminController {
  @Inject()
  communityAdminService: CommunityAdminService;

  @ApiOperation({ summary: '帖子列表（含待审）' })
  @Auth('admin')
  @Get('/posts')
  async posts(
    @Query('status') status: string | undefined,
    @Query('keyword') keyword: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10
  ) {
    return this.communityAdminService.postList(
      status === undefined || status === '' ? undefined : Number(status),
      keyword,
      Number(page),
      Number(pageSize)
    );
  }

  @ApiOperation({ summary: '审核游记（pass/reject）' })
  @Auth('admin')
  @Post('/posts/:id/audit')
  async audit(
    @Param('id') id: number,
    @Body('pass') pass: boolean,
    @Body('reason') reason: string
  ) {
    return this.communityAdminService.auditPost(Number(id), !!pass, reason);
  }

  @ApiOperation({ summary: '热门加精 toggle' })
  @Auth('admin')
  @Post('/posts/:id/toggle-hot')
  async toggleHot(@Param('id') id: number) {
    return this.communityAdminService.toggleHot(Number(id));
  }

  @ApiOperation({ summary: '下架游记' })
  @Auth('admin')
  @Post('/posts/:id/delete')
  async deletePost(@Param('id') id: number) {
    return this.communityAdminService.deletePost(Number(id));
  }

  @ApiOperation({ summary: '评论列表' })
  @Auth('admin')
  @Get('/comments')
  async comments(
    @Query('postId') postId: number | undefined,
    @Query('status') status: string | undefined,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10
  ) {
    return this.communityAdminService.commentList(
      postId ? Number(postId) : undefined,
      status === undefined || status === '' ? undefined : Number(status),
      Number(page),
      Number(pageSize)
    );
  }

  @ApiOperation({ summary: '隐藏/恢复评论' })
  @Auth('admin')
  @Post('/comments/:id/status')
  async commentStatus(@Param('id') id: number, @Body('status') status: number) {
    return this.communityAdminService.toggleCommentStatus(Number(id), Number(status));
  }

  @ApiOperation({ summary: '举报列表' })
  @Auth('admin')
  @Get('/reports')
  async reports(
    @Query('status') status: string | undefined,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10
  ) {
    return this.communityAdminService.reportList(
      status === undefined || status === '' ? undefined : Number(status),
      Number(page),
      Number(pageSize)
    );
  }

  @ApiOperation({ summary: '处理举报（下架/忽略）' })
  @Auth('admin')
  @Post('/reports/:id/handle')
  async handleReport(
    @Param('id') id: number,
    @Body('takeDown') takeDown: boolean,
    @Body('note') note: string
  ) {
    return this.communityAdminService.handleReport(Number(id), !!takeDown, note);
  }

  @ApiOperation({ summary: '保存话题' })
  @Auth('admin')
  @Post('/topics/save')
  async saveTopic(@Body() dto: any) {
    return this.communityAdminService.saveTopic(dto);
  }

  @ApiOperation({ summary: '删除话题' })
  @Auth('admin')
  @Post('/topics/:id/delete')
  async deleteTopic(@Param('id') id: number) {
    return this.communityAdminService.deleteTopic(Number(id));
  }

  @ApiOperation({ summary: '社区数据统计' })
  @Auth('admin')
  @Get('/stats')
  async stats() {
    return this.communityAdminService.stats();
  }
}
