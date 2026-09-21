import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** 游记 */
@Entity('t_post')
export class PostEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id',  type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'title',  length: 200 })
  title: string;

  @Column({ name: 'content',  type: 'text' })
  content: string;

  @Column({ name: 'images',  type: 'text', nullable: true })
  images: string;

  @Column({ name: 'video_url',  length: 255, default: '' })
  videoUrl: string;

  @Column({ name: 'linked_type',  length: 20, default: '' })
  linkedType: string;

  @Column({ name: 'linked_id',  type: 'bigint', unsigned: true, nullable: true })
  linkedId: number | null;

  @Column({ name: 'linked_name',  length: 100, default: '' })
  linkedName: string;

  @Column({ name: 'topic_id',  type: 'bigint', unsigned: true, nullable: true })
  topicId: number | null;

  @Column({ name: 'like_count',  type: 'int', default: 0 })
  likeCount: number;

  @Column({ name: 'comment_count',  type: 'int', default: 0 })
  commentCount: number;

  @Column({ name: 'favorite_count',  type: 'int', default: 0 })
  favoriteCount: number;

  @Column({ name: 'view_count',  type: 'int', default: 0 })
  viewCount: number;

  @Column({ name: 'status',  type: 'tinyint', default: 0 })
  status: number;

  @Column({ name: 'reject_reason',  length: 255, default: '' })
  rejectReason: string;

  @Column({ name: 'is_hot',  type: 'tinyint', default: 0 })
  isHot: number;

  @Column({ name: 'published_at',  type: 'datetime', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/** 评论（含二级回复） */
@Entity('t_comment')
export class CommentEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'post_id',  type: 'bigint', unsigned: true })
  postId: number;

  @Column({ name: 'user_id',  type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'content',  length: 500 })
  content: string;

  @Column({ name: 'parent_id',  type: 'bigint', unsigned: true, default: 0 })
  parentId: number;

  @Column({ name: 'reply_user_id',  type: 'bigint', unsigned: true, nullable: true })
  replyUserId: number | null;

  @Column({ name: 'like_count',  type: 'int', default: 0 })
  likeCount: number;

  @Column({ name: 'status',  type: 'tinyint', default: 1 })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 话题 */
@Entity('t_topic')
export class TopicEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'name',  length: 50 })
  name: string;

  @Column({ name: 'intro',  length: 500, default: '' })
  intro: string;

  @Column({ name: 'cover_image',  length: 500, nullable: true })
  coverImage: string;

  @Column({ name: 'follow_count',  type: 'int', default: 0 })
  followCount: number;

  @Column({ name: 'post_count',  type: 'int', default: 0 })
  postCount: number;

  @Column({ name: 'is_recommend',  type: 'tinyint', default: 0 })
  isRecommend: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 用户关注话题 */
@Entity('t_topic_follow')
export class TopicFollowEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id',  type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'topic_id',  type: 'bigint', unsigned: true })
  topicId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 关注关系 */
@Entity('t_follow')
export class FollowEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id',  type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'follow_user_id',  type: 'bigint', unsigned: true })
  followUserId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 举报 */
@Entity('t_report')
export class ReportEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'report_user_id',  type: 'bigint', unsigned: true })
  reportUserId: number;

  @Column({ name: 'target_type',  length: 20 })
  targetType: string;

  @Column({ name: 'target_id',  type: 'bigint', unsigned: true })
  targetId: number;

  @Column({ name: 'reason',  length: 500 })
  reason: string;

  @Column({ name: 'status',  type: 'tinyint', default: 0 })
  status: number;

  @Column({ name: 'handle_note',  length: 255, default: '' })
  handleNote: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
