-- =============================================================
-- 乌东文旅平台 初始数据 DML
-- 图片为本地占位 SVG（server/uploads/seeds/ 由脚本生成）
-- 演示账号：admin/admin123、13800000001/user123、merchant1-4/merchant123
-- =============================================================
-- 强制本次导入连接的字符集，防止 docker 初始化时中文被按 latin1 读入产生乱码
SET NAMES utf8mb4;
USE wudong;

-- ---------- 用户 ----------
INSERT INTO t_user (id, phone, password, nickname, role, status) VALUES
(1, '13800000000', '$2b$10$i8tOPcgEyYimRX6BgIeZg.B99u13t5lD2Osk93axr031ooweeTmFG', '平台管理员', 'admin', 1),
(2, '13800000001', '$2b$10$XteybQj3/a6cZ7A7dTvjz.JiVCaqPr/Kb1hBDwHk6RbadIyzOuYoK', '苗岭行者', 'user', 1),
(3, '13800000002', '$2b$10$gcpzzo5BlxnVTUNGgvAWe.lHS6GFOiA/8IAmbXlMihiUN9pS9zbmW', '银饰商家', 'merchant', 1),
(4, '13800000003', '$2b$10$gcpzzo5BlxnVTUNGgvAWe.lHS6GFOiA/8IAmbXlMihiUN9pS9zbmW', '长桌宴商家', 'merchant', 1),
(5, '13800000004', '$2b$10$gcpzzo5BlxnVTUNGgvAWe.lHS6GFOiA/8IAmbXlMihiUN9pS9zbmW', '吊脚楼民宿商家', 'merchant', 1),
(6, '13800000005', '$2b$10$gcpzzo5BlxnVTUNGgvAWe.lHS6GFOiA/8IAmbXlMihiUN9pS9zbmW', '苗寨游商家', 'merchant', 1);

INSERT INTO t_user (phone, password, nickname, role, gender, region, bio) VALUES
('13900000001', '$2b$10$XteybQj3/a6cZ7A7dTvjz.JiVCaqPr/Kb1hBDwHk6RbadIyzOuYoK', '山水闲客', 'user', 1, '贵州贵阳', '热爱苗寨风光的摄影爱好者'),
('13900000002', '$2b$10$XteybQj3/a6cZ7A7dTvjz.JiVCaqPr/Kb1hBDwHk6RbadIyzOuYoK', '银铃叮当', 'user', 2, '广东广州', '非遗手工艺收藏者'),
('13900000003', '$2b$10$XteybQj3/a6cZ7A7dTvjz.JiVCaqPr/Kb1hBDwHk6RbadIyzOuYoK', '行摄黔东南', 'user', 1, '重庆', '喜欢记录少数民族村寨生活');

-- ---------- 角色 ----------
INSERT INTO t_role (id, role_name, permissions) VALUES
(1, '超级管理员', '["*"]'),
(2, '运营', '["user:manage","content:audit","home:operate","message:send","order:view","data:view"]'),
(3, '财务', '["finance:manage","settlement:manage","data:view"]');

-- ---------- 商家 ----------
INSERT INTO t_merchant (user_id, shop_name, module_type, contact, contact_phone, license_no, status) VALUES
(3, '苗银世家银饰工坊', 'clothing', '吴师傅', '13800000002', '91522601MA0001', 1),
(4, '乌东长桌宴', 'food', '阿朵姐', '13800000003', '91522601MA0002', 1),
(5, '吊脚楼民宿群', 'hotel', '石阿公', '13800000004', '91522601MA0003', 1),
(6, '乌东苗寨游', 'travel', '潘导', '13800000005', '91522601MA0004', 1);

-- ---------- 商品分类（衣） ----------
INSERT INTO t_product_category (id, name, parent_id, icon, sort) VALUES
(1, '银饰', 0, '/uploads/seeds/cat-silver.svg', 1),
(2, '蜡染', 0, '/uploads/seeds/cat-batik.svg', 2),
(3, '刺绣', 0, '/uploads/seeds/cat-embroidery.svg', 3),
(4, '服饰', 0, '/uploads/seeds/cat-costume.svg', 4),
(5, '其他', 0, '/uploads/seeds/cat-other.svg', 5),
(11, '银手镯', 1, '', 1),
(12, '银项圈', 1, '', 2),
(13, '银头饰', 1, '', 3),
(21, '蜡染布艺', 2, '', 1),
(22, '蜡染桌旗', 2, '', 2),
(31, '刺绣挂件', 3, '', 1),
(32, '刺绣荷包', 3, '', 2),
(41, '苗族女装', 4, '', 1),
(42, '苗族童装', 4, '', 2),
(43, '苗族男装', 4, '', 3);

-- ---------- 传承人 ----------
INSERT INTO t_inheritor (id, name, title, craft, story) VALUES
(1, '吴水云', '黔东南州级银饰锻造非遗传承人', '银饰锻造', '吴水云十二岁随父学习银饰锻造，三十年如一日敲打拉丝，其"錾花手镯"工艺被收入贵州省非物质文化遗产名录。他坚持纯手工打造，一件银饰需经历熔银、锻打、錾花、焊接、洗银等十余道工序。'),
(2, '杨晓梅', '蜡染技艺县级非遗传承人', '蜡染', '杨晓梅自幼随祖母学习蜡染，以铜刀蘸蜂蜡在布上作画，纹样取自苗寨梯田、蝴蝶妈妈与枫树图腾。她希望让更多年轻人看见蜡染之美。'),
(3, '李绣娘', '苗族刺绣传承人', '刺绣', '李绣娘擅长数纱绣与打籽绣，一针一线绣出苗族古歌里的故事，作品曾获黔东南州手工艺大赛金奖。');

-- ---------- 商品（衣） ----------
INSERT INTO t_product (id, title, subtitle, category_id, merchant_id, main_image, price, market_price, stock, sales, rating, craft_intro, detail, inheritor_id, freight, status) VALUES
(1, '手工錾花银手镯（中号）', '纯手工锻打 錾花工艺', 11, 1, '/uploads/seeds/product-photos/miao-silver-bracelet.jpg', 680.00, 880.00, 50, 126, 4.8,
'采用传统錾花工艺，在银条上手工錾刻苗族传统纹样。历经熔银、锻打、拉丝、錾花、焊接、洗银等十二道工序，每件纹样皆有细微差异，独一无二。',
'<h3>工艺特色</h3><p>苗族银饰锻制技艺是国家级非物质文化遗产。錾花手镯以纯银为材（S990），纹样取自枫树图腾与蝴蝶妈妈传说。</p><h3>佩戴与保养</h3><p>银饰接触硫化物会变黑，可用擦银布轻拭；不佩戴时密封存放。</p>', 1, 0, 1),
(2, '枫树图腾银项圈', '苗族盛装标志 拉丝工艺', 12, 1, '/uploads/seeds/product-photos/miao-silver-jewelry.jpg', 1280.00, 1580.00, 20, 58, 4.9,
'苗族盛装必备银项圈，采用拉丝与錾刻结合的工艺，圈身錾刻枫树、蝴蝶纹样，寓意万物起源。',
'<h3>文化背景</h3><p>苗族古歌中，枫树孕育蝴蝶妈妈，蝴蝶妈妈生下苗族祖先。枫树图腾是苗族银饰最常见纹样之一。</p>', 1, 0, 1),
(3, '手工蜡染桌旗', '蓝白之间 非遗手作', 22, 1, '/uploads/seeds/product-photos/miao-batik.jpg', 168.00, 228.00, 100, 210, 4.7,
'以蜂蜡为防染剂，铜刀作画，蓝靛浸染。纹样为苗寨梯田与铜鼓纹，可作茶席、桌旗。',
'<h3>工艺流程</h3><p>画蜡 → 浸染 → 脱蜡 → 清洗。浸染次数越多，蓝色越深。</p>', 2, 8, 1),
(4, '苗族数纱绣荷包', '一针一线 吉祥纹样', 32, 1, '/uploads/seeds/product-photos/miao-embroidery.jpg', 98.00, 138.00, 80, 96, 4.8,
'数纱绣荷包，绣有鱼纹与花卉纹样，寓意年年有余。内置拉绳收口，可装香囊或小物。',
'<h3>工艺说明</h3><p>数纱绣按布纹经纬线数纱下针，绣面平整细腻，是苗族刺绣代表技法。</p>', 3, 8, 1),
(5, '苗族刺绣女装上衣', '盛装改良 日常可穿', 41, 1, '/uploads/seeds/product-photos/miao-clothing.jpg', 468.00, 588.00, 30, 45, 4.6,
'改良苗族女装，保留交领、刺绣、银饰点缀等传统元素，版型适合日常穿着。',
'<h3>穿着场景</h3><p>节日、旅拍、日常皆宜。提供 S/M/L 码。</p>', 3, 0, 1),
(6, '蜡染布艺挂画', '梯田人家 装饰布艺', 21, 1, '/uploads/seeds/product-photos/miao-batik-hanging-v2.jpg', 268.00, 328.00, 40, 67, 4.5,
'大幅蜡染挂画《梯田人家》，描绘乌东苗寨吊脚楼与层叠梯田，适合民宿、书房装饰。',
'<h3>规格</h3><p>尺寸 60cm x 90cm，附挂绳，可挂可展。</p>', 2, 10, 1),
(7, '苗族男装刺绣外套', '节庆盛装 手工织绣', 43, 1, '/uploads/seeds/product-photos/miao-male-clothes-2160.jpg', 698.00, 798.00, 18, 36, 4.8,
'以深色织布为底，配苗绣、流苏与彩条纹样，适合节庆穿着、旅拍和舞台展示。',
'<h3>穿着建议</h3><p>外套为宽松版型，内搭白色上衣更能凸显刺绣纹样。</p>', 3, 12, 1),
(8, '彩珠流苏盛装披肩', '彩珠手工串饰 旅拍亮点', 41, 1, '/uploads/seeds/product-photos/miao-female-clothes-2164.jpg', 428.00, 528.00, 25, 49, 4.9,
'以多色玻璃珠与刺绣底布制作，流苏层次丰富，是苗族盛装中最醒目的搭配单品。',
'<h3>工艺说明</h3><p>彩珠逐颗串接，建议平放保存，避免重物挤压流苏。</p>', 3, 10, 1),
(9, '苗银彩珠流苏项饰', '银片铃铛 彩珠垂坠', 12, 1, '/uploads/seeds/product-photos/miao-female-clothes-2166.jpg', 368.00, 468.00, 30, 62, 4.7,
'银片、彩珠与小铃铛相互呼应，走动时清脆灵动，可搭配素色上衣或民族风服装。',
'<h3>尺寸</h3><p>项饰长度约 42cm，流苏最长约 18cm，附可调节系带。</p>', 1, 8, 1),
(10, '银泡纹蜡染布艺', '传统银泡纹 手工染制', 21, 1, '/uploads/seeds/product-photos/miao-female-clothes-2205.jpg', 158.00, 198.00, 50, 41, 4.6,
'以传统银泡纹为灵感的蜡染布艺，可作为桌旗、收纳布或家居软装搭配使用。',
'<h3>材质</h3><p>棉布手工染制，约 45cm x 45cm，建议冷水轻柔洗涤。</p>', 2, 8, 1),
(11, '苗绣拼布女装上衣', '几何纹样 拼布刺绣', 41, 1, '/uploads/seeds/product-photos/miao-female-clothes-2165.jpg', 538.00, 638.00, 20, 28, 4.8,
'选用几何拼布与彩线刺绣，保留苗族服饰的层次感，并调整为适合日常穿着的版型。',
'<h3>尺码</h3><p>提供 S/M/L 三个尺码，棉麻面料，建议反面冷水手洗。</p>', 3, 0, 1),
(12, '苗绣百褶裙', '彩线刺绣 手工压褶', 41, 1, '/uploads/seeds/product-photos/miao-female-clothes-2163.jpg', 488.00, 588.00, 22, 31, 4.7,
'裙摆以彩线刺绣和手工压褶呈现苗族传统纹样，适合节庆、演出和旅行拍摄。',
'<h3>保养说明</h3><p>建议干洗或手洗，悬挂晾干后可低温熨烫恢复褶皱。</p>', 3, 10, 1),
(13, '苗族男装节庆围腰', '传统织带 复古配饰', 43, 1, '/uploads/seeds/product-photos/miao-male-clothes-2159.jpg', 198.00, 258.00, 40, 23, 4.5,
'取材于苗族男装的传统织带与纹样，可搭配外套、衬衫或作为旅拍造型配饰。',
'<h3>规格</h3><p>织带宽约 16cm，长度约 180cm，两端带手工流苏。</p>', 1, 8, 1);

INSERT INTO t_product_sku (product_id, spec_name, price, stock, image) VALUES
(1, '银饰-手镯-中号', 680.00, 30, '/uploads/seeds/product-silver-1.svg'),
(1, '银饰-手镯-小号', 620.00, 20, '/uploads/seeds/product-silver-1.svg'),
(2, '银饰-项圈-标准', 1280.00, 20, '/uploads/seeds/product-silver-2.svg'),
(3, '蜡染-桌旗-标准', 168.00, 100, '/uploads/seeds/product-batik-1.svg'),
(4, '刺绣-荷包-标准', 98.00, 80, '/uploads/seeds/product-embroidery-1.svg'),
(5, '服饰-女装-S', 468.00, 10, '/uploads/seeds/product-costume-1.svg'),
(5, '服饰-女装-M', 468.00, 10, '/uploads/seeds/product-costume-1.svg'),
(5, '服饰-女装-L', 468.00, 10, '/uploads/seeds/product-costume-1.svg'),
(6, '蜡染-挂画-标准', 268.00, 40, '/uploads/seeds/product-batik-2.svg'),
(7, '男装外套-M', 698.00, 6, '/uploads/seeds/product-photos/miao-male-clothes-2160.jpg'),
(7, '男装外套-L', 698.00, 6, '/uploads/seeds/product-photos/miao-male-clothes-2160.jpg'),
(7, '男装外套-XL', 718.00, 6, '/uploads/seeds/product-photos/miao-male-clothes-2160.jpg'),
(8, '彩珠披肩-均码', 428.00, 25, '/uploads/seeds/product-photos/miao-female-clothes-2164.jpg'),
(9, '流苏项饰-标准', 368.00, 30, '/uploads/seeds/product-photos/miao-female-clothes-2166.jpg'),
(10, '银泡纹-45cm', 158.00, 50, '/uploads/seeds/product-photos/miao-female-clothes-2205.jpg'),
(11, '女装上衣-S', 538.00, 7, '/uploads/seeds/product-photos/miao-female-clothes-2165.jpg'),
(11, '女装上衣-M', 538.00, 7, '/uploads/seeds/product-photos/miao-female-clothes-2165.jpg'),
(11, '女装上衣-L', 558.00, 6, '/uploads/seeds/product-photos/miao-female-clothes-2165.jpg'),
(12, '百褶裙-S', 488.00, 7, '/uploads/seeds/product-photos/miao-female-clothes-2163.jpg'),
(12, '百褶裙-M', 488.00, 8, '/uploads/seeds/product-photos/miao-female-clothes-2163.jpg'),
(12, '百褶裙-L', 508.00, 7, '/uploads/seeds/product-photos/miao-female-clothes-2163.jpg'),
(13, '节庆围腰-均码', 198.00, 40, '/uploads/seeds/product-photos/miao-male-clothes-2159.jpg');

INSERT INTO t_product_image (product_id, image_url, sort) VALUES
(1, '/uploads/seeds/product-photos/miao-silver-bracelet.jpg', 1),
(2, '/uploads/seeds/product-photos/miao-silver-jewelry.jpg', 1),
(3, '/uploads/seeds/product-photos/miao-batik.jpg', 1),
(4, '/uploads/seeds/product-photos/miao-embroidery.jpg', 1),
(5, '/uploads/seeds/product-photos/miao-clothing.jpg', 1),
(6, '/uploads/seeds/product-photos/miao-batik-hanging-v2.jpg', 1),
(7, '/uploads/seeds/product-photos/miao-male-clothes-2160.jpg', 1),
(8, '/uploads/seeds/product-photos/miao-female-clothes-2164.jpg', 1),
(9, '/uploads/seeds/product-photos/miao-female-clothes-2166.jpg', 1),
(10, '/uploads/seeds/product-photos/miao-female-clothes-2205.jpg', 1),
(11, '/uploads/seeds/product-photos/miao-female-clothes-2165.jpg', 1),
(12, '/uploads/seeds/product-photos/miao-female-clothes-2163.jpg', 1),
(13, '/uploads/seeds/product-photos/miao-male-clothes-2159.jpg', 1);

-- ---------- 商品评价示例（每件商品 0-4 条，固定种子数据） ----------
INSERT INTO t_review (user_id, biz_type, biz_id, rating, content, merchant_reply, created_at) VALUES
(2, 'product', 7, 5, '外套细节很有层次，旅拍时非常上镜，尺码也合适。', '感谢您的喜欢，祝您旅途愉快。', '2026-09-01 10:20:00'),
(7, 'product', 7, 4, '织带和流苏做得很细致，建议再增加一个小码。', '', '2026-09-03 14:35:00'),
(8, 'product', 7, 5, '颜色比照片里更有质感，节日表演穿很好看。', '谢谢认可，我们会继续做好手工细节。', '2026-09-05 09:48:00'),
(9, 'product', 8, 5, '彩珠很亮但不夸张，披在素色衣服上特别出片。', '', '2026-09-02 16:10:00'),
(2, 'product', 8, 4, '做工不错，流苏保存时要注意别压到。', '感谢提醒，平放保存会更好。', '2026-09-06 11:25:00'),
(7, 'product', 8, 5, '送给朋友的生日礼物，她非常喜欢。', '', '2026-09-07 18:40:00'),
(8, 'product', 8, 4, '配色很特别，快递包装也很仔细。', '', '2026-09-08 13:05:00'),
(9, 'product', 9, 5, '铃铛声音清脆，项饰不会太重，日常搭配也可以。', '感谢您的细致分享。', '2026-09-04 12:16:00'),
(2, 'product', 9, 4, '长度刚好，系带调节很方便。', '', '2026-09-09 15:30:00'),
(7, 'product', 10, 5, '布艺纹样很精细，放在茶桌上很有民族风。', '', '2026-09-03 09:40:00'),
(8, 'product', 11, 4, '上衣版型舒适，建议尺码表再写详细一点。', '谢谢建议，我们会补充更清晰的尺码指引。', '2026-09-06 17:55:00'),
(9, 'product', 11, 5, '拼布和刺绣都很漂亮，旅行拍照效果很好。', '', '2026-09-08 10:08:00'),
(2, 'product', 12, 5, '裙摆的褶皱很自然，走路时很有层次感。', '', '2026-09-05 14:20:00'),
(7, 'product', 12, 4, '颜色很好看，和上衣搭配后很完整。', '感谢您的搭配分享。', '2026-09-09 11:46:00');

-- ---------- 农产品（食） ----------
INSERT INTO t_farm_category (id, name, icon, sort) VALUES
(1, '茶叶', '/uploads/seeds/cat-tea.svg', 1),
(2, '腊肉', '/uploads/seeds/cat-bacon.svg', 2),
(3, '米酒', '/uploads/seeds/cat-wine.svg', 3),
(4, '酸食', '/uploads/seeds/cat-sour.svg', 4),
(5, '其他', '/uploads/seeds/cat-other.svg', 5);

INSERT INTO t_farm_product (id, category_id, merchant_id, name, price, spec, stock, sales, main_image, origin, shelf_life, detail, freight, status) VALUES
(1, 1, 2, '乌东云雾毛尖', 128.00, '250g/罐', 200, 320, '/uploads/seeds/farm-tea.svg', '乌东村云雾山茶园', '24个月', '<p>云雾山茶园海拔 1200 米，明前采摘一芽一叶，手工炒制。</p>', 8, 1),
(2, 2, 2, '苗家土法烟熏腊肉', 88.00, '500g/袋', 150, 240, '/uploads/seeds/farm-bacon.svg', '乌东村农户散养黑毛猪', '真空 6 个月', '<p>柴火烟熏 30 天，肥瘦相间，蒸炒皆宜。</p>', 10, 1),
(3, 3, 2, '苗家糯米甜酒酿', 38.00, '750g/坛', 300, 410, '/uploads/seeds/farm-wine.svg', '乌东村酿酒作坊', '冷藏 3 个月', '<p>糯米蒸制发酵，甜糯酒香，可煮汤圆、冲蛋花。</p>', 10, 1),
(4, 4, 2, '酸汤鱼底料（红酸）', 25.00, '300g/袋', 500, 560, '/uploads/seeds/farm-sour.svg', '乌东村辣椒基地', '12个月', '<p>以山地小番茄自然发酵的红酸汤，酸香浓郁。</p>', 8, 1);

-- ---------- 餐厅（食） ----------
INSERT INTO t_restaurant (id, name, merchant_id, address, longitude, latitude, open_time, capacity, main_image, intro, rating) VALUES
(1, '乌东长桌宴', 2, '乌东村中心广场旁', 108.123456, 26.456789, '10:30-21:30', 200, '/uploads/seeds/restaurant-1.svg', '苗家长桌宴是乌东村待客的最高礼仪。百人长桌一字排开，酸汤鱼、鼓藏肉、糯米饭依次上桌，席间苗家阿妹唱起敬酒歌，游客可体验"高山流水"敬酒仪式。', 4.8),
(2, '梯田味道农家菜', 2, '乌东村梯田观景台下方', 108.124500, 26.455800, '10:00-20:30', 80, '/uploads/seeds/restaurant-2.svg', '坐拥梯田景观的农家小馆，食材取自自家菜园与稻田，主打腊肉合蒸、稻花鱼。', 4.6);

INSERT INTO t_dish (restaurant_id, name, price, main_image, intro, is_signature) VALUES
(1, '酸汤鱼（稻田鱼）', 98.00, '/uploads/seeds/dish-1.svg', '乌东稻田鱼配山地小番茄发酵红酸汤，酸香开胃', 1),
(1, '鼓藏肉', 68.00, '/uploads/seeds/dish-2.svg', '苗族祭祖节庆菜，大块猪肉白煮蘸辣水', 1),
(1, '糯米饭配腊肉', 38.00, '/uploads/seeds/dish-3.svg', '五彩糯米饭搭配土法烟熏腊肉', 0),
(1, '米酒汤圆', 22.00, '/uploads/seeds/dish-4.svg', '糯米甜酒酿煮汤圆，暖胃甜品', 0),
(2, '腊肉合蒸', 58.00, '/uploads/seeds/dish-5.svg', '腊肉、腊肠、土豆片合蒸', 1),
(2, '酸辣稻花鱼', 78.00, '/uploads/seeds/dish-6.svg', '稻田现捞稻花鱼，酸辣做法', 0);

INSERT INTO t_meal_slot (restaurant_id, slot_name, max_booking) VALUES
(1, '午餐 11:30-13:30', 30),
(1, '晚餐 17:30-20:00', 30),
(2, '午餐 11:00-13:00', 15),
(2, '晚餐 17:00-19:30', 15);

-- ---------- 民宿（住） ----------
INSERT INTO t_homestay (id, name, merchant_id, address, longitude, latitude, style_tags, facility_tags, main_image, intro, rating, check_in_time, check_out_time, pet_policy, has_breakfast, deposit) VALUES
(1, '吊脚楼观景民宿', 3, '乌东村上寨 12 号', 108.124000, 26.457200, '吊脚楼,观景', 'WiFi,空调,独立卫浴,苗族特色', '/uploads/seeds/homestay-1.svg', '百年吊脚楼改造的观景民宿，推窗即见层叠梯田与云雾苗寨。楼体为纯木榫卯结构，木香萦绕，夜里可观星空听蛙鸣。', 4.9, '14:00', '12:00', 1, 1, 100.00),
(2, '苗家木楼小院', 3, '乌东村中寨 8 号', 108.124800, 26.456500, '木楼,庭院', 'WiFi,空调,独立卫浴', '/uploads/seeds/homestay-2.svg', '带庭院苗家木楼，院里有百年枫树与石磨，适合家庭与朋友结伴入住，可体验打糍粑、学蜡染。', 4.7, '14:00', '12:00', 0, 1, 100.00);

INSERT INTO t_room_type (id, homestay_id, name, bed_type, area, capacity, facilities, price, stock, main_image) VALUES
(1, 1, '苗族木屋大床房', '1.8m 大床', 28.0, 2, 'WiFi,空调,独立卫浴', 388.00, 5, '/uploads/seeds/room-1.svg'),
(2, 1, '观景双床房', '1.2m 双床', 32.0, 2, 'WiFi,空调,独立卫浴,观景阳台', 458.00, 4, '/uploads/seeds/room-2.svg'),
(3, 1, '星空阁楼套房', '2.0m 大床', 45.0, 3, 'WiFi,空调,独立卫浴,天窗', 688.00, 2, '/uploads/seeds/room-3.svg'),
(4, 2, '庭院大床房', '1.8m 大床', 26.0, 2, 'WiFi,空调,独立卫浴', 328.00, 4, '/uploads/seeds/room-4.svg'),
(5, 2, '家庭套房（两居）', '大床+双床', 55.0, 4, 'WiFi,空调,独立卫浴,客厅', 528.00, 2, '/uploads/seeds/room-5.svg'),
(6, 2, '苗家火塘房', '1.5m 大床', 30.0, 2, 'WiFi,空调,独立卫浴,火塘', 298.00, 3, '/uploads/seeds/room-6.svg');

-- 房态日历：未来 30 天（动态定价：周末 +20/晚）
INSERT INTO t_room_inventory (room_type_id, inv_date, price, total, booked, status)
SELECT r.id,
       DATE_ADD(CURDATE(), INTERVAL s.n DAY),
       r.price + IF(DAYOFWEEK(DATE_ADD(CURDATE(), INTERVAL s.n DAY)) IN (1, 7), 20, 0),
       r.stock, 0, 1
FROM t_room_type r
JOIN (
  WITH RECURSIVE seq(n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM seq WHERE n < 29)
  SELECT n FROM seq
) s
ON 1 = 1;

-- ---------- 景区与票务（行） ----------
INSERT INTO t_scenic (id, name, address, longitude, latitude, open_time, intro, main_image) VALUES
(1, '乌东苗寨景区', '贵州省黔东南州雷山县乌东村', 108.123456, 26.456789, '08:00-18:00', '乌东村地处雷公山腹地，保存着完整的苗族吊脚楼建筑群与农耕梯田景观，入选中国传统村落名录。可观赏苗族歌舞表演、银饰锻制技艺展示。', '/uploads/seeds/scenic-1.svg'),
(2, '雷公山国家森林公园', '雷山县雷公山', 108.150000, 26.400000, '08:30-17:30', '雷公山为苗岭主峰，原始森林覆盖率超 88%，可观赏云海、瀑布与高山杜鹃。', '/uploads/seeds/scenic-2.svg'),
(3, '西江千户苗寨', '贵州省黔东南州雷山县西江镇', 108.185000, 26.585000, '08:00-22:00', '全球最大的苗族聚居村寨，拥有千余户苗家吊脚楼。夜晚万家灯火璀璨，可体验苗族拦门酒、长桌宴、芦笙舞等民俗活动。', '/uploads/seeds/scenic-3.svg'),
(4, '云台山温泉度假区', '雷山县云台山风景区', 108.095000, 26.520000, '09:00-23:00', '天然硫磺温泉，水温常年保持 42-48℃，富含多种矿物质。依山而建的露天温泉池，可边泡温泉边赏苗岭云雾。', '/uploads/seeds/scenic-4.svg'),
(5, '郎德上寨', '贵州省黔东南州雷山县郎德镇', 108.210000, 26.480000, '08:30-18:00', '苗族露天博物馆，保留完整的苗族传统村落格局。可参观芦笙堂、风雨桥，观看原生态苗族歌舞表演，体验苗族拦门酒仪式。', '/uploads/seeds/scenic-5.svg'),
(6, '乌东梯田观景台', '雷山县乌东村北侧山脊', 108.128000, 26.465000, '06:00-19:00', '俯瞰乌东村全景的最佳位置，层层叠叠的梯田随四季变幻色彩。清晨云雾缭绕，日出时分金光洒满梯田，是摄影爱好者必到之地。', '/uploads/seeds/scenic-6.svg'),
(7, '银匠村手工艺体验馆', '雷山县控拜村', 108.165000, 26.425000, '09:00-17:30', '苗族银饰锻制技艺国家级非遗传承基地。可近距离观看银匠手工打制银饰全过程，并亲手体验银片锻打、錾刻等传统工艺。', '/uploads/seeds/scenic-7.svg');

INSERT INTO t_ticket_type (id, scenic_id, name, price, valid_rule) VALUES
(1, 1, '成人票', 60.00, '当日有效，入园一次'),
(2, 1, '儿童票', 30.00, '1.2m-1.5m 儿童，当日有效'),
(3, 1, '学生票', 30.00, '全日制学生凭学生证，当日有效'),
(4, 1, '家庭套票（2大1小）', 130.00, '当日有效，入园一次'),
(5, 2, '成人票', 40.00, '当日有效，入园一次'),
(6, 2, '学生票', 20.00, '全日制学生凭学生证，当日有效'),
(7, 3, '成人票', 90.00, '当日有效，入园一次'),
(8, 3, '儿童/学生票', 45.00, '1.2m-1.5m 儿童或学生凭证，当日有效'),
(9, 3, '观光车票', 20.00, '当日有效，含村内往返接驳'),
(10, 3, '夜游套票（含门票）', 120.00, '17:00后入园，含万家灯火夜景'),
(11, 4, '温泉单次票', 138.00, '当日有效，3小时'),
(12, 4, '温泉全天票', 198.00, '当日不限时畅泡'),
(13, 4, '情侣套票', 258.00, '双人全天票，含休息区使用'),
(14, 5, '成人票', 35.00, '当日有效，含歌舞表演'),
(15, 5, '学生票', 18.00, '学生凭证，当日有效'),
(16, 6, '观景台门票', 20.00, '当日有效'),
(17, 6, '日出专场票', 30.00, '06:00-09:00 专场，含热饮'),
(18, 7, '参观票', 25.00, '参观展厅与工坊演示'),
(19, 7, '体验票', 128.00, '含参观+银饰手工体验（2小时）');

-- 票务库存：未来 30 天
INSERT INTO t_ticket_inventory (ticket_type_id, use_date, total, sold, status)
SELECT tt.id, DATE_ADD(CURDATE(), INTERVAL s.n DAY), 200, 0, 1
FROM t_ticket_type tt
JOIN (
  WITH RECURSIVE seq(n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM seq WHERE n < 29)
  SELECT n FROM seq
) s
ON 1 = 1;

-- ---------- 路线套餐（行） ----------
INSERT INTO t_route (id, merchant_id, title, days, price, themes, included, notice, depart_from, dest, hotel_standard, meal_standard, main_image, detail, sales) VALUES
(1, 4, '乌东苗寨一日游（银饰工坊体验）', 1, 128.00, '研学', '苗寨门票、长桌宴午餐、银饰工坊体验、专业讲解', '建议穿舒适鞋履；银饰体验含材料费，成品可带走', '乌东村游客中心', '乌东苗寨', '-', '长桌宴午餐', '/uploads/seeds/route-1.svg', '<p>上午游览吊脚楼建筑群与梯田，中午体验苗家长桌宴，下午进入银饰工坊亲手锻打一枚银片吊坠。</p>', 88),
(2, 4, '苗寨梯田两日深度游', 2, 428.00, '摄影', '苗寨门票、吊脚楼民宿一晚、两正一早、蜡染体验、晨雾梯田摄影指导', '摄影团建议携带三脚架；如遇大雨行程将调整', '乌东村游客中心', '乌东苗寨+梯田观景台', '吊脚楼观景民宿（观景双床房）', '两正一早（含长桌宴）', '/uploads/seeds/route-2.svg', '<p>第一天游览苗寨、体验蜡染；次日清晨赴梯田观景台拍摄晨雾日出，中午返程。</p>', 45),
(3, 4, '雷公山云海两日游', 2, 498.00, '亲子', '雷公山门票、苗寨门票、民宿一晚、两正一早、云海日出观景、植物导赏', '山顶温差大请带外套；儿童需成人陪同', '乌东村游客中心', '雷公山+乌东苗寨', '苗家木楼小院（家庭套房）', '两正一早', '/uploads/seeds/route-3.svg', '<p>第一天游览乌东苗寨；次日凌晨登雷公山观云海日出，上午原始森林徒步与植物导赏。</p>', 32);

INSERT INTO t_route_itinerary (route_id, day_no, description, scenic, meal, hotel, transport) VALUES
(1, 1, '上午游览乌东苗寨吊脚楼群、梯田观景；中午长桌宴；下午银饰工坊体验', '乌东苗寨、梯田观景台', '长桌宴午餐', '-', '步行+摆渡车'),
(2, 1, '中午集合，游览苗寨与蜡染工坊，体验蜡染制作', '乌东苗寨', '晚餐', '吊脚楼观景民宿', '摆渡车'),
(2, 2, '清晨梯田观景台拍摄晨雾日出，上午自由拍摄，中午返程', '梯田观景台', '早餐+午餐', '-', '摆渡车'),
(3, 1, '中午集合，游览乌东苗寨，傍晚入住民宿', '乌东苗寨', '晚餐', '苗家木楼小院', '摆渡车'),
(3, 2, '凌晨登雷公山观云海日出，上午原始森林徒步，中午返程', '雷公山国家森林公园', '早餐+午餐', '-', '包车');

-- ---------- 交通攻略（行） ----------
INSERT INTO t_traffic_guide (title, depart_from, dest, transport, duration, cost, detail, image) VALUES
('贵阳出发：高铁+大巴', '贵阳', '乌东村', '高铁+大巴', '约 3 小时', '约 80 元', '<p>贵阳北站乘高铁至凯里南站（约 40 分钟），凯里南站换乘旅游大巴直达雷山县城（约 1 小时），再转乘乌东专线（约 40 分钟）。</p>', '/uploads/seeds/guide-1.svg'),
('凯里出发：自驾', '凯里', '乌东村', '自驾', '约 1.5 小时', '过路费约 30 元', '<p>凯里市区出发，沿凯雷公路行驶至雷山县，再沿县道进入乌东村。山路弯多，注意减速慢行。</p>', '/uploads/seeds/guide-2.svg'),
('广州出发：高铁+包车', '广州', '乌东村', '高铁+包车', '约 5 小时', '约 400 元', '<p>广州南站乘高铁至凯里南站（约 4 小时），出站包车直达乌东村（约 1.5 小时），人多包车更划算。</p>', '/uploads/seeds/guide-3.svg');

-- ---------- 社区（话题） ----------
INSERT INTO t_topic (id, name, intro, is_recommend) VALUES
(1, '#苗寨风光', '分享乌东苗寨的梯田、吊脚楼与云海', 1),
(2, '#非遗手作', '银饰、蜡染、刺绣等非遗体验记录', 1),
(3, '#苗家美食', '长桌宴、酸汤鱼、米酒等美食分享', 0),
(4, '#旅拍攻略', '乌东村摄影机位与游玩攻略', 0);

-- ---------- 平台运营 ----------
INSERT INTO t_banner (title, image_url, link_url, sort, status) VALUES
('乌东苗寨全景', '/uploads/seeds/banner-1.svg', '/travel/scenic/1', 1, 1),
('非遗银饰工坊', '/uploads/seeds/banner-2.svg', '/clothing', 2, 1),
('苗家长桌宴', '/uploads/seeds/banner-3.svg', '/food', 3, 1);

INSERT INTO t_activity_banner (title, image_url, link_url, start_time, end_time, status) VALUES
('苗年节庆典倒计时', '/uploads/seeds/activity-1.svg', '/community/topic/1', '2026-09-01 00:00:00', '2026-11-30 23:59:59', 1);

INSERT INTO t_announcement (title, content, status) VALUES
('平台上线公告', '乌东文旅"衣食住行"综合服务平台正式上线！衣、食、住、行、社区五大板块一站式服务，欢迎体验。', 1),
('国庆假期预订提醒', '国庆假期住宿与门票紧张，请提前 7 天预订。路线套餐需提前 1 天预订。', 1);

INSERT INTO t_recommend (slot_name, biz_type, biz_id, sort) VALUES
('首页热门商品', 'product', 1, 1),
('首页热门商品', 'product', 3, 2),
('首页热门商品', 'product', 4, 3),
('首页热门民宿', 'homestay', 1, 1),
('首页热门民宿', 'homestay', 2, 2),
('首页热门路线', 'route', 1, 1),
('首页热门路线', 'route', 2, 2);

INSERT INTO t_hot_keyword (keyword, sort) VALUES
('银饰', 1), ('长桌宴', 2), ('吊脚楼民宿', 3), ('梯田', 4), ('酸汤鱼', 5);

INSERT INTO t_sensitive_word (word) VALUES
('涉黄词示例'), ('涉政词示例'), ('暴恐词示例'), ('诈骗词示例');

INSERT INTO t_system_config (config_key, config_value, remark) VALUES
('commission_goods', '0.05', '实物商品平台抽佣比例'),
('commission_service', '0.10', '服务类（民宿/门票/餐位/路线）抽佣比例'),
('settlement_cycle', 'T+7', '财务结算周期'),
('order_timeout_minutes', '30', '订单超时关闭分钟数'),
('sms_code_fixed', '123456', '开发期模拟短信验证码');

-- ---------- 初始订单示例（游客已支付状态，用于演示订单中心） ----------
INSERT INTO t_order (id, order_no, user_id, merchant_id, order_type, status, total_amount, pay_amount, pay_time) VALUES
(1, 'WD202609070001', 2, 1, 'goods', 1, 680.00, 680.00, '2026-09-07 10:30:00'),
(2, 'WD202609070002', 2, 2, 'meal', 2, 98.00, 98.00, '2026-09-07 11:00:00');

INSERT INTO t_order_item (order_id, sku_id, title, spec_name, image, price, quantity, shipping_status) VALUES
(1, 1, '手工錾花银手镯（中号）', '银饰-手镯-中号', '/uploads/seeds/product-silver-1.svg', 680.00, 1, 0);

INSERT INTO t_meal_booking (order_id, restaurant_id, slot_id, booking_date, guest_count, contact_name, contact_phone) VALUES
(2, 1, 1, '2026-09-08', 2, '苗岭行者', '13800000001');

INSERT INTO t_pay_record (pay_no, order_id, user_id, amount, channel, status, paid_at) VALUES
('PAY20260907100001', 1, 2, 680.00, 'mock_wxpay', 1, '2026-09-07 10:30:00'),
('PAY20260907110001', 2, 2, 98.00, 'mock_wxpay', 1, '2026-09-07 11:00:00');

INSERT INTO t_finance_record (order_id, merchant_id, order_amount, commission_rate, commission, merchant_income) VALUES
(1, 1, 680.00, 0.05, 34.00, 646.00),
(2, 2, 98.00, 0.10, 9.80, 88.20);

INSERT INTO t_message (user_id, msg_type, title, content) VALUES
(2, 'system', '欢迎来到乌东文旅平台', '衣、食、住、行、社区一站式服务，祝您玩得开心！'),
(2, 'order', '订单支付成功', '订单 WD202609070001 支付成功，商家将尽快发货。');
