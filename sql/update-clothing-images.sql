SET NAMES utf8mb4;
USE wudong;

-- 更新商品图片为真实照片路径
UPDATE t_product SET main_image = '/uploads/clothing-photos/手工蜡染桌旗.png' WHERE id = 3;
UPDATE t_product SET main_image = '/uploads/clothing-photos/苗绣拼布女装上衣.jpg' WHERE id = 11;
UPDATE t_product SET main_image = '/uploads/clothing-photos/苗绣百褶裙.jpg' WHERE id = 12;
UPDATE t_product SET main_image = '/uploads/clothing-photos/苗族男装刺绣外套.jpg' WHERE id = 7;
UPDATE t_product SET main_image = '/uploads/clothing-photos/苗族男装节庆围腰.jpg' WHERE id = 13;
UPDATE t_product SET main_image = '/uploads/clothing-photos/苗银彩珠流苏项饰.png' WHERE id = 9;
UPDATE t_product SET main_image = '/uploads/clothing-photos/蜡染布艺挂画.png' WHERE id = 6;
UPDATE t_product SET main_image = '/uploads/clothing-photos/苗族银饰锻造.jpg' WHERE id = 1;

-- 背景图片可用于首页或分类页
-- /uploads/clothing-photos/背景.jpg
