-- =============================================================
-- 乌东文旅"衣食住行"综合服务平台 数据库 DDL
-- MySQL 8.0 | 字符集 utf8mb4
-- 设计说明见 docs/12-数据库设计文档.md
-- =============================================================
-- 强制本次导入连接的字符集，防止 docker 初始化时中文被按 latin1 读入产生乱码
SET NAMES utf8mb4;
DROP DATABASE IF EXISTS wudong;
CREATE DATABASE wudong DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE wudong;

-- =============================================================
-- 一、用户域
-- =============================================================

-- 用户表（游客/商家/管理员统一，role 区分）
CREATE TABLE t_user (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  phone         VARCHAR(20)  NOT NULL COMMENT '手机号',
  password      VARCHAR(100) NOT NULL COMMENT 'bcrypt 密码',
  nickname      VARCHAR(50)  DEFAULT '' COMMENT '昵称',
  avatar        VARCHAR(255) DEFAULT '' COMMENT '头像 URL',
  gender        TINYINT      DEFAULT 0 COMMENT '0未知 1男 2女',
  region        VARCHAR(100) DEFAULT '' COMMENT '地区',
  bio           VARCHAR(500) DEFAULT '' COMMENT '个人简介',
  role          VARCHAR(20)  NOT NULL DEFAULT 'user' COMMENT 'user/merchant/admin',
  status        TINYINT      NOT NULL DEFAULT 1 COMMENT '1正常 0封禁',
  ban_until     DATETIME     DEFAULT NULL COMMENT '禁言截止时间',
  last_login_at DATETIME     DEFAULT NULL COMMENT '最后登录时间',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_phone (phone)
) ENGINE=InnoDB COMMENT='用户';

-- 收货地址
CREATE TABLE t_user_address (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  receiver      VARCHAR(50)  NOT NULL COMMENT '收货人',
  phone         VARCHAR(20)  NOT NULL,
  province      VARCHAR(50)  NOT NULL,
  city          VARCHAR(50)  NOT NULL,
  district      VARCHAR(50)  NOT NULL,
  detail        VARCHAR(200) NOT NULL COMMENT '详细地址',
  is_default    TINYINT      NOT NULL DEFAULT 0 COMMENT '1默认',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id)
) ENGINE=InnoDB COMMENT='收货地址';

-- 商家
CREATE TABLE t_merchant (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL COMMENT '关联用户账号',
  shop_name     VARCHAR(100) NOT NULL COMMENT '店铺名',
  module_type   VARCHAR(20)  NOT NULL COMMENT '所属模块 clothing/food/hotel/travel',
  contact       VARCHAR(50)  DEFAULT '' COMMENT '联系人',
  contact_phone VARCHAR(20)  DEFAULT '' COMMENT '联系方式',
  license_no    VARCHAR(50)  DEFAULT '' COMMENT '营业执照号',
  id_card       VARCHAR(30)  DEFAULT '' COMMENT '法人身份证（脱敏存储）',
  materials     TEXT         COMMENT '资质材料图片 JSON',
  status        TINYINT      NOT NULL DEFAULT 1 COMMENT '1正常 0下线',
  settle_status TINYINT      NOT NULL DEFAULT 0 COMMENT '0未结算 1已结算',
  join_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '入驻时间',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id),
  KEY idx_module (module_type)
) ENGINE=InnoDB COMMENT='商家';

-- 商家入驻申请
CREATE TABLE t_merchant_apply (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  shop_name     VARCHAR(100) NOT NULL,
  module_type   VARCHAR(20)  NOT NULL COMMENT 'clothing/food/hotel/travel',
  contact       VARCHAR(50)  NOT NULL,
  contact_phone VARCHAR(20)  NOT NULL,
  license_no    VARCHAR(50)  NOT NULL COMMENT '营业执照号',
  materials     TEXT         COMMENT '资质材料图片 JSON',
  status        TINYINT      NOT NULL DEFAULT 0 COMMENT '0待审核 1通过 2驳回',
  reject_reason VARCHAR(255) DEFAULT '' COMMENT '驳回原因',
  audit_admin_id BIGINT UNSIGNED DEFAULT NULL,
  audit_at      DATETIME     DEFAULT NULL COMMENT '审核时间',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id)
) ENGINE=InnoDB COMMENT='商家入驻申请';

-- 角色（RBAC）
CREATE TABLE t_role (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_name     VARCHAR(50)  NOT NULL,
  permissions   TEXT         COMMENT '权限标识 JSON 数组',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB COMMENT='角色';

-- 操作日志
CREATE TABLE t_operation_log (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  operator_id   BIGINT UNSIGNED NOT NULL,
  operator_name VARCHAR(50)  DEFAULT '',
  op_type       VARCHAR(50)  NOT NULL COMMENT '操作类型',
  op_object     VARCHAR(255) DEFAULT '' COMMENT '操作对象',
  op_content    VARCHAR(500) DEFAULT '' COMMENT '操作内容',
  ip            VARCHAR(50)  DEFAULT '',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_operator (operator_id),
  KEY idx_created (created_at)
) ENGINE=InnoDB COMMENT='操作日志';

-- =============================================================
-- 二、订单支付域
-- =============================================================

-- 统一订单主表（5 类订单）
CREATE TABLE t_order (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_no      VARCHAR(32)  NOT NULL COMMENT '订单号',
  user_id       BIGINT UNSIGNED NOT NULL,
  merchant_id   BIGINT UNSIGNED DEFAULT NULL COMMENT '商家ID（有则关联）',
  order_type    VARCHAR(20)  NOT NULL COMMENT 'goods/meal/hotel/ticket/route',
  status        TINYINT      NOT NULL DEFAULT 0 COMMENT '0待支付 1已支付待确认 2已确认 3进行中 4已完成 5已取消 6退款中 7已退款',
  total_amount  DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '订单总额',
  pay_amount    DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '实付金额',
  pay_time      DATETIME     DEFAULT NULL COMMENT '支付时间',
  cancel_reason VARCHAR(255) DEFAULT '' COMMENT '取消原因',
  remark        VARCHAR(255) DEFAULT '' COMMENT '买家备注',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_order_no (order_no),
  KEY idx_user (user_id),
  KEY idx_type_status (order_type, status)
) ENGINE=InnoDB COMMENT='统一订单';

-- 商品订单明细（goods 类）
CREATE TABLE t_order_item (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id      BIGINT UNSIGNED NOT NULL,
  sku_id        BIGINT UNSIGNED DEFAULT NULL COMMENT '模块一 SKU',
  farm_product_id BIGINT UNSIGNED DEFAULT NULL COMMENT '模块二 农产品',
  title         VARCHAR(200) NOT NULL COMMENT '商品快照标题',
  spec_name     VARCHAR(100) DEFAULT '' COMMENT '规格快照',
  image         VARCHAR(255) DEFAULT '' COMMENT '图片快照',
  price         DECIMAL(10,2) NOT NULL COMMENT '成交单价',
  quantity      INT          NOT NULL DEFAULT 1,
  shipping_status TINYINT    NOT NULL DEFAULT 0 COMMENT '0待发货 1已发货 2已收货',
  logistics_no  VARCHAR(50)  DEFAULT '' COMMENT '物流单号',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order (order_id)
) ENGINE=InnoDB COMMENT='商品订单明细';

-- 餐位预订（meal 类扩展）
CREATE TABLE t_meal_booking (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id      BIGINT UNSIGNED NOT NULL,
  restaurant_id BIGINT UNSIGNED NOT NULL,
  slot_id       BIGINT UNSIGNED NOT NULL COMMENT '时段',
  booking_date  DATE         NOT NULL COMMENT '预订日期',
  guest_count   INT          NOT NULL COMMENT '人数',
  contact_name  VARCHAR(50)  NOT NULL,
  contact_phone VARCHAR(20)  NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_order (order_id),
  KEY idx_rest_date (restaurant_id, booking_date)
) ENGINE=InnoDB COMMENT='餐位预订扩展';

-- 住宿预订（hotel 类扩展）
CREATE TABLE t_hotel_booking (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id      BIGINT UNSIGNED NOT NULL,
  homestay_id   BIGINT UNSIGNED NOT NULL,
  room_type_id  BIGINT UNSIGNED NOT NULL,
  check_in_date DATE         NOT NULL,
  check_out_date DATE        NOT NULL,
  guest_name    VARCHAR(50)  NOT NULL COMMENT '入住人',
  guest_id_card VARCHAR(30)  NOT NULL COMMENT '入住人身份证',
  guest_phone   VARCHAR(20)  NOT NULL,
  nights        INT          NOT NULL COMMENT '晚数',
  checkin_code  VARCHAR(12)  NOT NULL COMMENT '入住码',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_order (order_id),
  KEY idx_room_date (room_type_id, check_in_date)
) ENGINE=InnoDB COMMENT='住宿预订扩展';

-- 门票/路线订单（ticket/route 类扩展）
CREATE TABLE t_ticket_order (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id      BIGINT UNSIGNED NOT NULL,
  biz_type      VARCHAR(20)  NOT NULL COMMENT 'ticket门票/route路线',
  biz_id        BIGINT UNSIGNED NOT NULL COMMENT '票种ID或路线ID',
  use_date      DATE         NOT NULL COMMENT '使用/出发日期',
  quantity      INT          NOT NULL COMMENT '数量',
  visitors      TEXT         COMMENT '游客信息 JSON',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_order (order_id)
) ENGINE=InnoDB COMMENT='票务订单扩展';

-- 支付记录
CREATE TABLE t_pay_record (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pay_no        VARCHAR(32)  NOT NULL COMMENT '支付流水号',
  order_id      BIGINT UNSIGNED NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  channel       VARCHAR(20)  NOT NULL DEFAULT 'mock_wxpay' COMMENT '支付渠道',
  status        TINYINT      NOT NULL DEFAULT 0 COMMENT '0待支付 1成功 2失败',
  paid_at       DATETIME     DEFAULT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_pay_no (pay_no),
  KEY idx_order (order_id)
) ENGINE=InnoDB COMMENT='支付记录';

-- 退款记录
CREATE TABLE t_refund_record (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  refund_no     VARCHAR(32)  NOT NULL,
  order_id      BIGINT UNSIGNED NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  reason        VARCHAR(255) DEFAULT '',
  status        TINYINT      NOT NULL DEFAULT 0 COMMENT '0申请中 1已退款 2已驳回',
  handle_note   VARCHAR(255) DEFAULT '',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_refund_no (refund_no),
  KEY idx_order (order_id)
) ENGINE=InnoDB COMMENT='退款记录';

-- 统一购物车
CREATE TABLE t_cart_item (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  sku_id        BIGINT UNSIGNED DEFAULT NULL COMMENT '模块一 SKU',
  farm_product_id BIGINT UNSIGNED DEFAULT NULL COMMENT '模块二 农产品',
  quantity      INT          NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id)
) ENGINE=InnoDB COMMENT='统一购物车';

-- =============================================================
-- 三、互动域（统一评价/收藏/点赞）
-- =============================================================

-- 统一评价
CREATE TABLE t_review (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id      BIGINT UNSIGNED DEFAULT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  biz_type      VARCHAR(20)  NOT NULL COMMENT 'product/farm/restaurant/homestay/ticket/route',
  biz_id        BIGINT UNSIGNED NOT NULL,
  rating        TINYINT      NOT NULL DEFAULT 5 COMMENT '1-5 星',
  content       VARCHAR(1000) NOT NULL,
  images        TEXT         COMMENT '图片 JSON',
  follow_up     VARCHAR(1000) DEFAULT '' COMMENT '追评',
  merchant_reply VARCHAR(1000) DEFAULT '' COMMENT '商家回复',
  is_hidden     TINYINT      NOT NULL DEFAULT 0 COMMENT '1隐藏',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_biz (biz_type, biz_id)
) ENGINE=InnoDB COMMENT='统一评价';

-- 统一收藏（商品/餐厅/民宿/线路/游记）
CREATE TABLE t_favorite (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  biz_type      VARCHAR(20)  NOT NULL COMMENT 'product/restaurant/homestay/route/post',
  biz_id        BIGINT UNSIGNED NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_biz (user_id, biz_type, biz_id),
  KEY idx_biz (biz_type, biz_id)
) ENGINE=InnoDB COMMENT='统一收藏';

-- =============================================================
-- 四、模块一 衣-非遗商品
-- =============================================================

CREATE TABLE t_product_category (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(50)  NOT NULL COMMENT '分类名',
  parent_id     BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0为一级分类',
  icon          VARCHAR(255) DEFAULT '',
  sort          INT          NOT NULL DEFAULT 0,
  status        TINYINT      NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB COMMENT='商品分类';

CREATE TABLE t_inheritor (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(50)  NOT NULL COMMENT '传承人姓名',
  title         VARCHAR(100) DEFAULT '' COMMENT '称号（如州级非遗传承人）',
  craft         VARCHAR(50)  DEFAULT '' COMMENT '工艺门类',
  story         TEXT         COMMENT '传承故事',
  avatar        VARCHAR(255) DEFAULT '',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB COMMENT='非遗传承人';

CREATE TABLE t_product (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title         VARCHAR(200) NOT NULL,
  subtitle      VARCHAR(200) DEFAULT '',
  category_id   BIGINT UNSIGNED NOT NULL,
  merchant_id   BIGINT UNSIGNED NOT NULL,
  main_image    VARCHAR(255) NOT NULL,
  price         DECIMAL(10,2) NOT NULL COMMENT '起售价（SKU 最低价）',
  market_price  DECIMAL(10,2) DEFAULT NULL COMMENT '市场价',
  stock         INT          NOT NULL DEFAULT 0 COMMENT '总库存（SKU 汇总）',
  sales         INT          NOT NULL DEFAULT 0 COMMENT '销量',
  rating        DECIMAL(2,1) NOT NULL DEFAULT 5.0 COMMENT '评分',
  craft_intro   TEXT         COMMENT '工艺介绍',
  detail        MEDIUMTEXT   COMMENT '详情富文本',
  inheritor_id  BIGINT UNSIGNED DEFAULT NULL,
  freight       DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '运费',
  status        TINYINT      NOT NULL DEFAULT 1 COMMENT '1上架 0下架',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_category (category_id),
  KEY idx_merchant (merchant_id)
) ENGINE=InnoDB COMMENT='非遗商品';

CREATE TABLE t_product_sku (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id    BIGINT UNSIGNED NOT NULL,
  spec_name     VARCHAR(100) NOT NULL COMMENT '如 银饰-手镯-中号',
  price         DECIMAL(10,2) NOT NULL,
  stock         INT          NOT NULL DEFAULT 0,
  image         VARCHAR(255) DEFAULT '',
  status        TINYINT      NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_product (product_id)
) ENGINE=InnoDB COMMENT='商品 SKU';

CREATE TABLE t_product_image (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id    BIGINT UNSIGNED NOT NULL,
  image_url     VARCHAR(255) NOT NULL,
  sort          INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_product (product_id)
) ENGINE=InnoDB COMMENT='商品图片';

-- =============================================================
-- 五、模块二 食-餐饮美食
-- =============================================================

CREATE TABLE t_restaurant (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  merchant_id   BIGINT UNSIGNED NOT NULL,
  address       VARCHAR(255) NOT NULL,
  longitude     DECIMAL(10,6) DEFAULT NULL COMMENT '经度',
  latitude      DECIMAL(10,6) DEFAULT NULL COMMENT '纬度',
  open_time     VARCHAR(50)  DEFAULT '11:00-21:00' COMMENT '营业时间',
  capacity      INT          NOT NULL DEFAULT 50 COMMENT '容纳人数',
  main_image    VARCHAR(255) DEFAULT '',
  intro         TEXT         COMMENT '餐厅介绍',
  rating        DECIMAL(2,1) NOT NULL DEFAULT 5.0,
  status        TINYINT      NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_merchant (merchant_id)
) ENGINE=InnoDB COMMENT='餐厅';

CREATE TABLE t_dish (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id BIGINT UNSIGNED NOT NULL,
  name          VARCHAR(100) NOT NULL,
  price         DECIMAL(10,2) NOT NULL,
  main_image    VARCHAR(255) DEFAULT '',
  intro         VARCHAR(500) DEFAULT '',
  is_signature  TINYINT      NOT NULL DEFAULT 0 COMMENT '1招牌菜',
  status        TINYINT      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_restaurant (restaurant_id)
) ENGINE=InnoDB COMMENT='餐厅菜品';

CREATE TABLE t_meal_slot (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id BIGINT UNSIGNED NOT NULL,
  slot_name     VARCHAR(50)  NOT NULL COMMENT '如 午餐 11:30-13:30',
  max_booking   INT          NOT NULL DEFAULT 20 COMMENT '最大预订数',
  status        TINYINT      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_restaurant (restaurant_id)
) ENGINE=InnoDB COMMENT='餐位时段';

-- 餐位预订余量（restaurant+slot+date 维度）
CREATE TABLE t_meal_quota (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id BIGINT UNSIGNED NOT NULL,
  slot_id       BIGINT UNSIGNED NOT NULL,
  booking_date  DATE         NOT NULL,
  booked        INT          NOT NULL DEFAULT 0 COMMENT '已订桌数',
  PRIMARY KEY (id),
  UNIQUE KEY uk_rest_slot_date (restaurant_id, slot_id, booking_date)
) ENGINE=InnoDB COMMENT='餐位预订余量';

CREATE TABLE t_farm_category (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(50)  NOT NULL,
  icon          VARCHAR(255) DEFAULT '',
  sort          INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB COMMENT='农产品分类';

CREATE TABLE t_farm_product (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id   BIGINT UNSIGNED NOT NULL,
  merchant_id   BIGINT UNSIGNED NOT NULL,
  name          VARCHAR(200) NOT NULL,
  price         DECIMAL(10,2) NOT NULL,
  spec          VARCHAR(100) DEFAULT '' COMMENT '规格',
  stock         INT          NOT NULL DEFAULT 0,
  sales         INT          NOT NULL DEFAULT 0,
  main_image    VARCHAR(255) DEFAULT '',
  origin        VARCHAR(100) DEFAULT '' COMMENT '产地（溯源）',
  shelf_life    VARCHAR(50)  DEFAULT '' COMMENT '保质期',
  detail        MEDIUMTEXT   COMMENT '详情',
  freight       DECIMAL(10,2) NOT NULL DEFAULT 0,
  status        TINYINT      NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_category (category_id)
) ENGINE=InnoDB COMMENT='农产品商品';

-- =============================================================
-- 六、模块三 住-住宿预订
-- =============================================================

CREATE TABLE t_homestay (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  merchant_id   BIGINT UNSIGNED NOT NULL,
  address       VARCHAR(255) NOT NULL,
  longitude     DECIMAL(10,6) DEFAULT NULL,
  latitude      DECIMAL(10,6) DEFAULT NULL,
  style_tags    VARCHAR(255) DEFAULT '' COMMENT '风格标签，逗号分隔（木楼/吊脚楼）',
  facility_tags VARCHAR(255) DEFAULT '' COMMENT '设施标签（WiFi/空调/独立卫浴）',
  main_image    VARCHAR(255) DEFAULT '',
  intro         TEXT,
  rating        DECIMAL(2,1) NOT NULL DEFAULT 5.0,
  check_in_time VARCHAR(20)  DEFAULT '14:00' COMMENT '入住时间',
  check_out_time VARCHAR(20) DEFAULT '12:00' COMMENT '离店时间',
  pet_policy    TINYINT      NOT NULL DEFAULT 0 COMMENT '1允许宠物',
  has_breakfast TINYINT      NOT NULL DEFAULT 1 COMMENT '1含早',
  deposit       DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '押金',
  status        TINYINT      NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_merchant (merchant_id)
) ENGINE=InnoDB COMMENT='民宿';

CREATE TABLE t_room_type (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  homestay_id   BIGINT UNSIGNED NOT NULL,
  name          VARCHAR(100) NOT NULL COMMENT '如 苗族木屋大床房',
  bed_type      VARCHAR(50)  DEFAULT '' COMMENT '床型',
  area          DECIMAL(6,1) DEFAULT NULL COMMENT '面积㎡',
  capacity      INT          NOT NULL DEFAULT 2 COMMENT '容纳人数',
  facilities    VARCHAR(255) DEFAULT '',
  price         DECIMAL(10,2) NOT NULL COMMENT '基础价',
  stock         INT          NOT NULL DEFAULT 1 COMMENT '库存（同日期可售间数）',
  main_image    VARCHAR(255) DEFAULT '',
  status        TINYINT      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_homestay (homestay_id)
) ENGINE=InnoDB COMMENT='房型';

-- 房态日历（room+date 联合唯一，支持动态定价与预扣）
CREATE TABLE t_room_inventory (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_type_id  BIGINT UNSIGNED NOT NULL,
  inv_date      DATE         NOT NULL,
  price         DECIMAL(10,2) NOT NULL COMMENT '当日价格（动态定价）',
  total         INT          NOT NULL DEFAULT 1 COMMENT '当日总间数',
  booked        INT          NOT NULL DEFAULT 0 COMMENT '已预订间数',
  status        TINYINT      NOT NULL DEFAULT 1 COMMENT '1可订 0不可订',
  PRIMARY KEY (id),
  UNIQUE KEY uk_room_date (room_type_id, inv_date),
  KEY idx_date (inv_date)
) ENGINE=InnoDB COMMENT='房态日历';

-- =============================================================
-- 七、模块四 行-线路订票
-- =============================================================

CREATE TABLE t_scenic (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  address       VARCHAR(255) NOT NULL,
  longitude     DECIMAL(10,6) DEFAULT NULL,
  latitude      DECIMAL(10,6) DEFAULT NULL,
  open_time     VARCHAR(50)  DEFAULT '08:00-18:00',
  intro         TEXT,
  main_image    VARCHAR(255) DEFAULT '',
  status        TINYINT      NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB COMMENT='景区';

CREATE TABLE t_ticket_type (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  scenic_id     BIGINT UNSIGNED NOT NULL,
  name          VARCHAR(50)  NOT NULL COMMENT '成人票/儿童票/学生票/家庭套票',
  price         DECIMAL(10,2) NOT NULL,
  valid_rule    VARCHAR(255) DEFAULT '当日有效' COMMENT '有效期规则',
  status        TINYINT      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_scenic (scenic_id)
) ENGINE=InnoDB COMMENT='票种';

-- 票务库存（票种+日期维度）
CREATE TABLE t_ticket_inventory (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_type_id BIGINT UNSIGNED NOT NULL,
  use_date      DATE         NOT NULL,
  total         INT          NOT NULL DEFAULT 100,
  sold          INT          NOT NULL DEFAULT 0,
  status        TINYINT      NOT NULL DEFAULT 1 COMMENT '1可售 0停售',
  PRIMARY KEY (id),
  UNIQUE KEY uk_ticket_date (ticket_type_id, use_date)
) ENGINE=InnoDB COMMENT='票务分日期库存';

CREATE TABLE t_route (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  merchant_id   BIGINT UNSIGNED NOT NULL,
  title         VARCHAR(200) NOT NULL,
  days          INT          NOT NULL DEFAULT 1 COMMENT '1一日游 2两日游 3多日游',
  price         DECIMAL(10,2) NOT NULL,
  themes        VARCHAR(100) DEFAULT '' COMMENT '主题 亲子/摄影/研学/节庆',
  included      TEXT         COMMENT '包含项目',
  notice        TEXT         COMMENT '注意事项',
  depart_from   VARCHAR(100) DEFAULT '乌东村游客中心' COMMENT '出发地',
  dest          VARCHAR(100) NOT NULL COMMENT '目的地',
  hotel_standard VARCHAR(100) DEFAULT '' COMMENT '住宿标准',
  meal_standard VARCHAR(100) DEFAULT '' COMMENT '餐饮标准',
  main_image    VARCHAR(255) DEFAULT '',
  detail        MEDIUMTEXT   COMMENT '详情富文本',
  sales         INT          NOT NULL DEFAULT 0,
  status        TINYINT      NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB COMMENT='路线套餐';

CREATE TABLE t_route_itinerary (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  route_id      BIGINT UNSIGNED NOT NULL,
  day_no        INT          NOT NULL COMMENT '第几天',
  description   VARCHAR(1000) NOT NULL COMMENT '行程描述',
  scenic        VARCHAR(200) DEFAULT '' COMMENT '景点',
  meal          VARCHAR(200) DEFAULT '' COMMENT '用餐',
  hotel         VARCHAR(200) DEFAULT '' COMMENT '住宿',
  transport     VARCHAR(200) DEFAULT '' COMMENT '交通',
  PRIMARY KEY (id),
  KEY idx_route (route_id)
) ENGINE=InnoDB COMMENT='路线行程';

CREATE TABLE t_eticket (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id      BIGINT UNSIGNED NOT NULL,
  ticket_order_id BIGINT UNSIGNED NOT NULL COMMENT '票务订单扩展ID',
  code          VARCHAR(32)  NOT NULL COMMENT '电子票号/二维码内容',
  biz_type      VARCHAR(20)  NOT NULL COMMENT 'ticket/route',
  biz_id        BIGINT UNSIGNED NOT NULL,
  use_date      DATE         NOT NULL,
  visitor_name  VARCHAR(50)  DEFAULT '' COMMENT '游客姓名',
  status        TINYINT      NOT NULL DEFAULT 0 COMMENT '0未使用 1已使用 2已退款',
  verify_at     DATETIME     DEFAULT NULL COMMENT '核销时间',
  verify_by     BIGINT UNSIGNED DEFAULT NULL COMMENT '核销人',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_code (code),
  KEY idx_order (order_id)
) ENGINE=InnoDB COMMENT='电子票';

CREATE TABLE t_traffic_guide (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title         VARCHAR(200) NOT NULL,
  depart_from   VARCHAR(100) NOT NULL COMMENT '出发地（贵阳/凯里/广州）',
  dest          VARCHAR(100) NOT NULL DEFAULT '乌东村',
  transport     VARCHAR(50)  NOT NULL COMMENT '交通方式',
  duration      VARCHAR(50)  DEFAULT '' COMMENT '时长',
  cost          VARCHAR(50)  DEFAULT '' COMMENT '费用',
  detail        MEDIUMTEXT   COMMENT '详细说明',
  image         VARCHAR(255) DEFAULT '',
  status        TINYINT      NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB COMMENT='交通攻略';

-- =============================================================
-- 八、模块五 社区-照片分享
-- =============================================================

CREATE TABLE t_post (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  title         VARCHAR(200) NOT NULL,
  content       TEXT         NOT NULL COMMENT '游记文字 ≤5000 字',
  images        TEXT         COMMENT '图片 JSON ≤9 张',
  video_url     VARCHAR(255) DEFAULT '',
  location      VARCHAR(200) DEFAULT '' COMMENT '位置信息',
  linked_type   VARCHAR(20)  DEFAULT '' COMMENT '关联地点类型 restaurant/homestay/scenic',
  linked_id     BIGINT UNSIGNED DEFAULT NULL,
  linked_name   VARCHAR(100) DEFAULT '' COMMENT '关联地点名称快照',
  topic_id      BIGINT UNSIGNED DEFAULT NULL COMMENT '主话题',
  like_count    INT          NOT NULL DEFAULT 0,
  comment_count INT          NOT NULL DEFAULT 0,
  favorite_count INT         NOT NULL DEFAULT 0,
  view_count    INT          NOT NULL DEFAULT 0,
  status        TINYINT      NOT NULL DEFAULT 0 COMMENT '0审核中 1正常 2已下架',
  reject_reason VARCHAR(255) DEFAULT '',
  is_hot        TINYINT      NOT NULL DEFAULT 0 COMMENT '1首页推荐',
  published_at  DATETIME     DEFAULT NULL COMMENT '过审时间，审核中为空',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id),
  KEY idx_status (status, published_at)
) ENGINE=InnoDB COMMENT='游记';

CREATE TABLE t_comment (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id       BIGINT UNSIGNED NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  content       VARCHAR(500) NOT NULL,
  parent_id     BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0一级评论，否则为回复',
  reply_user_id BIGINT UNSIGNED DEFAULT NULL COMMENT '被回复用户',
  like_count    INT          NOT NULL DEFAULT 0,
  status        TINYINT      NOT NULL DEFAULT 1 COMMENT '1正常 0删除',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_post (post_id),
  KEY idx_parent (parent_id)
) ENGINE=InnoDB COMMENT='评论';

CREATE TABLE t_topic (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(50)  NOT NULL COMMENT '话题名（含#）',
  intro         VARCHAR(500) DEFAULT '',
  follow_count  INT          NOT NULL DEFAULT 0,
  post_count    INT          NOT NULL DEFAULT 0,
  is_recommend  TINYINT      NOT NULL DEFAULT 0 COMMENT '1置顶推荐',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_name (name)
) ENGINE=InnoDB COMMENT='话题';

CREATE TABLE t_topic_follow (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL COMMENT '关注者',
  topic_id      BIGINT UNSIGNED NOT NULL COMMENT '话题',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_topic (user_id, topic_id),
  KEY idx_user (user_id),
  KEY idx_topic (topic_id)
) ENGINE=InnoDB COMMENT='用户关注话题';

CREATE TABLE t_follow (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL COMMENT '关注者',
  follow_user_id BIGINT UNSIGNED NOT NULL COMMENT '被关注者',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_follow (user_id, follow_user_id)
) ENGINE=InnoDB COMMENT='关注关系';

CREATE TABLE t_like (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  target_type   VARCHAR(20)  NOT NULL COMMENT 'post/comment',
  target_id     BIGINT UNSIGNED NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_like (user_id, target_type, target_id)
) ENGINE=InnoDB COMMENT='点赞';

CREATE TABLE t_report (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_user_id BIGINT UNSIGNED NOT NULL,
  target_type   VARCHAR(20)  NOT NULL COMMENT 'post/comment',
  target_id     BIGINT UNSIGNED NOT NULL,
  reason        VARCHAR(500) NOT NULL COMMENT '举报原因',
  status        TINYINT      NOT NULL DEFAULT 0 COMMENT '0待处理 1已处理(删除) 2已驳回',
  handle_note   VARCHAR(255) DEFAULT '',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_status (status)
) ENGINE=InnoDB COMMENT='举报';

-- =============================================================
-- 九、平台域
-- =============================================================

CREATE TABLE t_announcement (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title         VARCHAR(200) NOT NULL,
  content       TEXT,
  status        TINYINT      NOT NULL DEFAULT 1 COMMENT '1发布 0下架',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB COMMENT='平台公告';

CREATE TABLE t_banner (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title         VARCHAR(100) NOT NULL,
  image_url     VARCHAR(255) NOT NULL,
  link_url      VARCHAR(255) DEFAULT '',
  sort          INT          NOT NULL DEFAULT 0,
  status        TINYINT      NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB COMMENT='首页轮播图';

CREATE TABLE t_activity_banner (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title         VARCHAR(100) NOT NULL,
  image_url     VARCHAR(255) NOT NULL,
  link_url      VARCHAR(255) DEFAULT '',
  start_time    DATETIME     DEFAULT NULL,
  end_time      DATETIME     DEFAULT NULL,
  status        TINYINT      NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB COMMENT='活动横幅';

CREATE TABLE t_recommend (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slot_name     VARCHAR(50)  NOT NULL COMMENT '推荐位名称（首页热门商品/热门游记等）',
  biz_type      VARCHAR(20)  NOT NULL COMMENT 'product/post/restaurant/homestay/route',
  biz_id        BIGINT UNSIGNED NOT NULL,
  sort          INT          NOT NULL DEFAULT 0,
  status        TINYINT      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_slot (slot_name)
) ENGINE=InnoDB COMMENT='推荐位';

CREATE TABLE t_message (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL COMMENT '接收用户',
  msg_type      VARCHAR(20)  NOT NULL COMMENT 'system系统/order订单/interact互动',
  title         VARCHAR(200) NOT NULL,
  content       VARCHAR(1000) DEFAULT '',
  is_read       TINYINT      NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id)
) ENGINE=InnoDB COMMENT='站内消息';

CREATE TABLE t_system_config (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  config_key    VARCHAR(50)  NOT NULL,
  config_value  VARCHAR(500) NOT NULL,
  remark        VARCHAR(200) DEFAULT '',
  PRIMARY KEY (id),
  UNIQUE KEY uk_key (config_key)
) ENGINE=InnoDB COMMENT='系统配置';

CREATE TABLE t_sensitive_word (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  word          VARCHAR(100) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_word (word)
) ENGINE=InnoDB COMMENT='敏感词库';

CREATE TABLE t_finance_record (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id      BIGINT UNSIGNED NOT NULL,
  merchant_id   BIGINT UNSIGNED NOT NULL,
  order_amount  DECIMAL(10,2) NOT NULL COMMENT '订单金额',
  commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.05 COMMENT '平台抽佣比例',
  commission    DECIMAL(10,2) NOT NULL COMMENT '平台抽佣',
  merchant_income DECIMAL(10,2) NOT NULL COMMENT '商家收入',
  settle_status TINYINT      NOT NULL DEFAULT 0 COMMENT '0未结算 1已结算',
  settle_no     VARCHAR(32)  DEFAULT '' COMMENT '结算单号',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_merchant (merchant_id)
) ENGINE=InnoDB COMMENT='财务记录';

CREATE TABLE t_settlement (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  settle_no     VARCHAR(32)  NOT NULL,
  merchant_id   BIGINT UNSIGNED NOT NULL,
  amount        DECIMAL(10,2) NOT NULL COMMENT '结算金额',
  period_start  DATE         NOT NULL,
  period_end    DATE         NOT NULL,
  status        TINYINT      NOT NULL DEFAULT 0 COMMENT '0待打款 1已打款',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_settle_no (settle_no)
) ENGINE=InnoDB COMMENT='结算单';

-- 访问日志（埋点：PV/UV）
CREATE TABLE t_visit_log (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0为匿名',
  page          VARCHAR(100) DEFAULT '' COMMENT '页面路径',
  module        VARCHAR(20)  DEFAULT '' COMMENT '模块',
  action        VARCHAR(50)  DEFAULT '' COMMENT '行为 view/click/cart/order',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_created (created_at)
) ENGINE=InnoDB COMMENT='访问日志';

CREATE TABLE t_search_history (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  keyword       VARCHAR(100) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id)
) ENGINE=InnoDB COMMENT='搜索历史';

CREATE TABLE t_hot_keyword (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  keyword       VARCHAR(100) NOT NULL,
  sort          INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_keyword (keyword)
) ENGINE=InnoDB COMMENT='热搜词';
