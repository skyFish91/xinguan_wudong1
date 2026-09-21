/**
 * 乌东文旅平台 路演 PPT 生成脚本
 * 用法：cd ppt && npm run generate（输出 路演PPT.pptx）
 * 内容与 docs/14-答辩讲稿.md、docs/15-路演演示脚本.md 对应，数据为最终实测值
 */
import pptxgen from 'pptxgenjs';

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_16x9';
pptx.author = '乌东文旅开发小组';
pptx.title = '乌东文旅衣食住行综合服务平台 路演';

// 配色：深青绿（山水）+ 暖橙（苗绣）+ 米白背景
const C_BG = 'FAF8F4';
const C_TITLE = '2F5D50';
const C_ACCENT = 'C77B3F';
const C_TEXT = '333333';
const C_SUB = '666666';
const FONT = '微软雅黑';

/** 每页公共样式：背景 + 标题 + 页码 */
function baseSlide(title, subtitle = '') {
  const slide = pptx.addSlide();
  slide.background = { color: C_BG };
  slide.addShape('rect', { x: 0, y: 0, w: 0.18, h: 5.63, fill: { color: C_TITLE } });
  slide.addText(title, { x: 0.55, y: 0.35, w: 8.9, h: 0.7, fontSize: 26, bold: true, color: C_TITLE, fontFace: FONT });
  if (subtitle) {
    slide.addText(subtitle, { x: 0.55, y: 1.02, w: 8.9, h: 0.4, fontSize: 13, color: C_SUB, fontFace: FONT });
  }
  slide.addShape('line', { x: 0.55, y: 1.45, w: 8.7, h: 0, line: { color: C_ACCENT, width: 1.5 } });
  return slide;
}

/** 内容要点列表（支持两级缩进，自动行距） */
function bullets(slide, items, y = 1.7, h = 3.4) {
  slide.addText(
    items.map((it) => ({
      text: it.text,
      options: {
        bullet: it.sub ? { code: '2013', indent: 20 } : { code: '25CF', indent: 8 },
        fontSize: it.sub ? 13 : 15,
        color: it.sub ? C_SUB : C_TEXT,
        bold: !!it.bold,
        breakLine: true,
        fontFace: FONT,
      },
    })),
    { x: 0.7, y, w: 8.6, h, valign: 'top', lineSpacingMultiple: 1.15 }
  );
}

function pageNum(slide, n) {
  slide.addText(String(n), { x: 9.3, y: 5.15, w: 0.5, h: 0.35, fontSize: 11, color: C_SUB, align: 'right', fontFace: FONT });
}

// ---------- 1 封面 ----------
{
  const slide = pptx.addSlide();
  slide.background = { color: C_TITLE };
  slide.addShape('rect', { x: 0, y: 4.62, w: 10, h: 0.12, fill: { color: C_ACCENT } });
  slide.addText('乌东文旅"衣食住行"综合服务平台', { x: 0.8, y: 1.5, w: 8.4, h: 1.1, fontSize: 40, bold: true, color: 'FFFFFF', fontFace: FONT });
  slide.addText('面向贵州黔东南乌东村的文旅一站式服务平台', { x: 0.8, y: 2.65, w: 8.4, h: 0.5, fontSize: 18, color: 'E8E2D8', fontFace: FONT });
  slide.addText('课程小组项目路演 · 2026 年 9 月', { x: 0.8, y: 4.85, w: 8.4, h: 0.4, fontSize: 14, color: 'BFCBC4', fontFace: FONT });
}

// ---------- 2 项目概述 ----------
{
  const slide = baseSlide('项目概述', '需求背景与建设范围');
  slide.addText('为乌东村文旅场景提供"衣、食、住、行、社区"五位一体的一站式服务：游客看得到、买得到、约得到、玩得到，商家与平台管得住。',
    { x: 0.7, y: 1.75, w: 8.6, h: 0.9, fontSize: 15, color: C_TEXT, fontFace: FONT, lineSpacingMultiple: 1.2 });
  bullets(slide, [
    { text: '衣：非遗商品（银饰、蜡染、刺绣），SKU 规格 + 传承人介绍' },
    { text: '食：餐厅浏览、餐位时段预订、农产品特产' },
    { text: '住：民宿筛选、房价日历、预订入住码' },
    { text: '行：景区门票、精品路线、电子票核销、攻略' },
    { text: '社区：照片分享、话题、点赞评论、敏感词审核' },
    { text: '平台：用户体系、统一购物车、订单中心、模拟支付、管理后台' },
  ], 2.75, 2.3);
  pageNum(slide, 2);
}

// ---------- 3 技术架构 ----------
{
  const slide = baseSlide('技术架构', '模块化单体，四层结构');
  bullets(slide, [
    { text: '客户端层：Vue 3 游客 PC 端 + 管理后台（两套应用）', bold: true },
    { text: '接入层：JWT 双 token 鉴权（access 2 小时 + refresh 7 天自动续期）、统一响应与错误码', bold: true },
    { text: '业务层：六大模块 + 公共能力（用户/购物车/订单/支付/消息/上传），模块边界清晰', bold: true },
    { text: '数据层：MySQL 8.0（55 张表，八域划分）+ Redis 7（验证码/首页/详情/路线列表缓存）', bold: true },
    { text: '技术栈：后端 Midway 3 + TypeScript，前端 Vue 3 + Element Plus，Docker Compose 一键部署' },
    { text: '工程化：Jest 227 用例、GitHub Actions CI（构建/测试/镜像验证）、10 条架构决策记录' },
  ]);
  pageNum(slide, 3);
}

// ---------- 4 架构决策 ----------
{
  const slide = baseSlide('架构决策：为什么是模块化单体', '需求书中的微服务图是"建议"，我们做了自己的评估');
  bullets(slide, [
    { text: '需求书给出的微服务拆分图为建议性质，非强制要求', bold: true },
    { text: '6 天课程周期：单体可交付、可演示、可验证，微服务要付出注册/网关/调用链的额外复杂度' },
    { text: '模块边界按微服务粒度划分（衣/食/住/行/社区/平台），未来拆分路径保留' },
    { text: '决策过程沉淀为 10 条 ADR（架构决策记录），答辩可查' },
  ]);
  pageNum(slide, 4);
}

// ---------- 5 亮点一 统一订单中心 ----------
{
  const slide = baseSlide('亮点一：统一订单中心', '五类订单共享一条状态机');
  bullets(slide, [
    { text: '商品 / 餐位 / 住宿 / 门票 / 路线五类订单共用状态机：待支付→已支付→已确认→进行中→已完成，加取消/退款分支', bold: true },
    { text: '每类订单用扩展表承载差异化信息（餐位时段、入住码、电子票等）' },
    { text: '支付回调幂等处理（已支付直接返回），同一回调内完成佣金记账' },
    { text: '佣金规则配置化：实物订单 5%、服务订单 10%，后台可调' },
  ]);
  pageNum(slide, 5);
}

// ---------- 6 亮点二 库存防超卖 ----------
{
  const slide = baseSlide('亮点二：库存防超卖', '演示不翻车的底气');
  bullets(slide, [
    { text: 'SKU、房态、票务、餐位四类库存全部使用条件 UPDATE 原子扣减（WHERE stock >= n），超卖直接失败', bold: true },
    { text: '超时未支付订单由定时任务自动关闭并回补库存' },
    { text: '整条链路（预扣、回补、超卖拦截）均有单元测试覆盖' },
    { text: '真实缺陷案例：路线下单曾误扣票务库存（路线必买必败），被测试拦截后修复' },
  ]);
  pageNum(slide, 6);
}

// ---------- 7 亮点三 内容安全 ----------
{
  const slide = baseSlide('亮点三：内容安全', '敏感词过滤 + 人工审核闭环');
  bullets(slide, [
    { text: '社区发帖经敏感词过滤，命中的自动转人工审核，管理员可过审或驳回', bold: true },
    { text: '评论命中敏感词直接隐藏，不计入展示数' },
    { text: '真实缺陷案例：审核路径写入 published_at 触发数据库约束错误（发帖必报错），被测试拦截后修复' },
  ]);
  pageNum(slide, 7);
}

// ---------- 8 亮点四 测试与部署 ----------
{
  const slide = baseSlide('亮点四：测试与部署工程化', '代码、测试、部署全部可复现');
  bullets(slide, [
    { text: '227 个单元测试用例全部通过，语句覆盖率 80.74%（要求 60%），分支 60.97%', bold: true },
    { text: '测试拦截 3 个"演示必翻车"缺陷（DDL 约束、路线下单、缓存串数据），运行日志巡检再发现 1 个（未登录购物车计数 500）' },
    { text: 'MySQL、Redis、后端、两个前端共五容器，一条 docker compose 命令拉起，healthcheck + 启动顺序编排' },
    { text: 'CI/CD 流水线：构建、测试（真实 MySQL）、镜像验证，本地等效验证全部通过' },
    { text: '联调验收又发现并修复容器环境两缺陷：种子数据中文乱码（SET NAMES utf8mb4）、种子图片未入镜像（COPY uploads/seeds）' },
  ]);
  pageNum(slide, 8);
}

// ---------- 9 AI 协作方法 ----------
{
  const slide = baseSlide('AI 协作方法（本课程特色）', '全程 Claude Code 协作开发');
  bullets(slide, [
    { text: '任务分解先行：6 天课程拆成 19 个可验收任务，逐项跟踪', bold: true },
    { text: '规范技能化：命名、响应格式、防超卖约定写成项目级 Skill，AI 每次开发自动加载，全项目零风格漂移', bold: true },
    { text: '契约先行：实体 + DDL + Swagger 注解三处同步' },
    { text: '测试兜底：单元测试不仅验证行为，还反向拦截了 3 个真实缺陷' },
    { text: '体会：AI 把写代码成本降下来之后，人的精力应放在架构决策、需求确认、验收标准上' },
  ]);
  pageNum(slide, 9);
}

// ---------- 10 演示流程 ----------
{
  const slide = baseSlide('演示流程', '一条完整游客旅程');
  bullets(slide, [
    { text: '注册登录 → 浏览非遗商品（详情/规格/收藏/评价）', bold: true },
    { text: '餐位时段预订、民宿房价日历预订' },
    { text: '门票购买 + 精品路线下单 → 统一购物车结算（按商家拆单）' },
    { text: '模拟支付（扫码回调）→ 订单状态流转 → 电子票' },
    { text: '切换管理后台：商家接单核销、平台数据看板、内容审核、佣金记账' },
  ]);
  pageNum(slide, 10);
}

// ---------- 11 QA 预案 ----------
{
  const slide = baseSlide('常见问题预案');
  bullets(slide, [
    { text: '为什么用模块化单体而不是微服务？——需求书微服务图为建议；6 天周期单体可交付可演示；模块边界已按微服务粒度划分，拆分路径保留', bold: true },
    { text: '库存超卖怎么保证？——条件 UPDATE 原子扣减（WHERE stock >= n），MySQL 行锁保证并发安全，测试覆盖超卖与回补' },
    { text: '为什么支付是模拟的？——无商户资质，需求书允许；回调接口按真实微信支付结构设计，接入真实支付只需替换回调来源' },
    { text: '测试覆盖率为什么选 60% 门槛？——任务要求 60%，实际 80.74%；admin 模块接口薄且多是主要拉低项' },
    { text: 'JWT 如何防泄露？——access 2 小时短有效期 + refresh 7 天，前端拦截器自动续期；密码 bcrypt 存储' },
  ]);
  pageNum(slide, 11);
}

// ---------- 12 结束页 ----------
{
  const slide = pptx.addSlide();
  slide.background = { color: C_TITLE };
  slide.addShape('rect', { x: 0, y: 1.55, w: 10, h: 0.1, fill: { color: C_ACCENT } });
  slide.addText('谢谢各位老师，请提问', { x: 0.8, y: 2.0, w: 8.4, h: 0.9, fontSize: 34, bold: true, color: 'FFFFFF', fontFace: FONT });
  slide.addText('从需求拆解到可部署系统：代码、测试、部署、文档全部可复现', { x: 0.8, y: 3.1, w: 8.4, h: 0.5, fontSize: 16, color: 'E8E2D8', fontFace: FONT });
  slide.addText('一条 docker compose 命令即可跑起完整系统', { x: 0.8, y: 3.65, w: 8.4, h: 0.4, fontSize: 13, color: 'BFCBC4', fontFace: FONT });
}

await pptx.writeFile({ fileName: '路演PPT.pptx' });
console.log('已生成：路演PPT.pptx');
