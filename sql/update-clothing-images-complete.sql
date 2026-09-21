SET NAMES utf8mb4;
USE wudong;

-- 将photos/cloths中的真实图片映射到对应的商品
-- 根据商品名称匹配图片文件名

-- ID 1: 手工錾花银手镯 -> 苗族银饰锻造.jpg
UPDATE t_product SET main_image = '/uploads/clothing-photos/苗族银饰锻造.jpg' WHERE id = 1;

-- ID 2: 枫树图腾银项圈 -> 苗族银饰锻造.jpg (银饰类)
UPDATE t_product SET main_image = '/uploads/clothing-photos/苗族银饰锻造.jpg' WHERE id = 2;

-- ID 3: 手工蜡染桌旗 -> 手工蜡染桌旗.png
UPDATE t_product SET main_image = '/uploads/clothing-photos/手工蜡染桌旗.png' WHERE id = 3;

-- ID 4: 苗族数纱绣荷包 -> 苗绣拼布女装上衣.jpg (刺绣类)
UPDATE t_product SET main_image = '/uploads/clothing-photos/苗绣拼布女装上衣.jpg' WHERE id = 4;

-- ID 5: 苗族刺绣女装上衣 -> 苗绣拼布女装上衣.jpg
UPDATE t_product SET main_image = '/uploads/clothing-photos/苗绣拼布女装上衣.jpg' WHERE id = 5;

-- ID 6: 蜡染布艺挂画 -> 蜡染布艺挂画.png
UPDATE t_product SET main_image = '/uploads/clothing-photos/蜡染布艺挂画.png' WHERE id = 6;

-- ID 7: 苗族男装刺绣外套 -> 苗族男装刺绣外套.jpg
UPDATE t_product SET main_image = '/uploads/clothing-photos/苗族男装刺绣外套.jpg' WHERE id = 7;

-- ID 8: 彩珠流苏盛装披肩 -> 苗银彩珠流苏项饰.png (流苏类)
UPDATE t_product SET main_image = '/uploads/clothing-photos/苗银彩珠流苏项饰.png' WHERE id = 8;

-- ID 9: 苗银彩珠流苏项饰 -> 苗银彩珠流苏项饰.png
UPDATE t_product SET main_image = '/uploads/clothing-photos/苗银彩珠流苏项饰.png' WHERE id = 9;

-- ID 10: 银泡纹蜡染布艺 -> 蜡染布艺挂画.png (蜡染类)
UPDATE t_product SET main_image = '/uploads/clothing-photos/蜡染布艺挂画.png' WHERE id = 10;

-- ID 11: 苗绣拼布女装上衣 -> 苗绣拼布女装上衣.jpg
UPDATE t_product SET main_image = '/uploads/clothing-photos/苗绣拼布女装上衣.jpg' WHERE id = 11;

-- ID 12: 苗绣百褶裙 -> 苗绣百褶裙.jpg
UPDATE t_product SET main_image = '/uploads/clothing-photos/苗绣百褶裙.jpg' WHERE id = 12;

-- ID 13: 苗族男装节庆围腰 -> 苗族男装节庆围腰.jpg
UPDATE t_product SET main_image = '/uploads/clothing-photos/苗族男装节庆围腰.jpg' WHERE id = 13;
