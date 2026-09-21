# -*- coding: utf-8 -*-
"""生成乌东文旅平台种子占位图（SVG）到 server/uploads/seeds/"""
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'server', 'uploads', 'seeds')

# 前缀 -> (主题色, 尺寸)
THEME = {
    'banner':   ('#5B4636', (1200, 400)),
    'activity': ('#A4453C', (800, 300)),
    'cat':      ('#7A9D7E', (600, 400)),
    'product':  ('#8B5E3C', (800, 600)),
    'dish':     ('#C58B4F', (800, 600)),
    'restaurant': ('#9C6B30', (800, 600)),
    'farm':     ('#6E8B3D', (800, 600)),
    'room':     ('#4A6FA5', (800, 600)),
    'homestay': ('#3D5A80', (800, 600)),
    'scenic':   ('#2E7D6B', (800, 600)),
    'route':    ('#2E7D6B', (800, 600)),
    'guide':    ('#386641', (800, 600)),
}

# 文件名 -> 显示文字
FILES = {
    'banner-1.svg': '乌东文旅 · 衣',
    'banner-2.svg': '乌东文旅 · 食',
    'banner-3.svg': '乌东文旅 · 住',
    'activity-1.svg': '苗年节活动',
    'cat-bacon.svg': '腊肉制品',
    'cat-batik.svg': '蜡染',
    'cat-costume.svg': '民族服饰',
    'cat-embroidery.svg': '苗绣',
    'cat-other.svg': '其他特产',
    'cat-silver.svg': '银饰',
    'cat-sour.svg': '酸汤系列',
    'cat-tea.svg': '茶叶',
    'cat-wine.svg': '米酒',
    'product-batik-1.svg': '蜡染方巾',
    'product-batik-2.svg': '蜡染壁挂',
    'product-costume-1.svg': '苗族盛装',
    'product-embroidery-1.svg': '苗绣绣片',
    'product-silver-1.svg': '银手镯',
    'product-silver-2.svg': '银项圈',
    'dish-1.svg': '酸汤鱼',
    'dish-2.svg': '腊肉炒饭',
    'dish-3.svg': '苗家豆腐',
    'dish-4.svg': '糯米饭',
    'dish-5.svg': '米酒',
    'dish-6.svg': '野菜汤',
    'restaurant-1.svg': '苗家酸汤馆',
    'restaurant-2.svg': '长桌宴餐厅',
    'farm-bacon.svg': '农家腊肉',
    'farm-sour.svg': '酸汤底料',
    'farm-tea.svg': '高山绿茶',
    'farm-wine.svg': '农家米酒',
    'homestay-1.svg': '吊脚楼民宿',
    'homestay-2.svg': '梯田景观民宿',
    'room-1.svg': '标准双床房',
    'room-2.svg': '大床房',
    'room-3.svg': '家庭套房',
    'room-4.svg': '景观大床房',
    'room-5.svg': '亲子房',
    'room-6.svg': '豪华套房',
    'scenic-1.svg': '乌东苗寨',
    'scenic-2.svg': '梯田观景台',
    'route-1.svg': '苗寨一日游',
    'route-2.svg': '梯田徒步两日游',
    'route-3.svg': '非遗体验三日游',
    'guide-1.svg': '高铁到达攻略',
    'guide-2.svg': '自驾路线攻略',
    'guide-3.svg': '大巴换乘攻略',
}

SVG_TPL = '''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{c1}"/>
      <stop offset="100%" stop-color="{c2}"/>
    </linearGradient>
  </defs>
  <rect width="{w}" height="{h}" fill="url(#bg)"/>
  <rect x="24" y="24" width="{w}-48" height="{h}-48" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="3" stroke-dasharray="12 8"/>
  <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle"
        font-family="'Microsoft YaHei','PingFang SC',sans-serif"
        font-size="{fs}" fill="#FFFFFF" fill-opacity="0.95" font-weight="bold">{label}</text>
  <text x="50%" y="70%" text-anchor="middle" dominant-baseline="middle"
        font-family="'Microsoft YaHei','PingFang SC',sans-serif"
        font-size="{fs2}" fill="#FFFFFF" fill-opacity="0.6">乌东文旅 · 衣食住行服务平台</text>
</svg>
'''


def darken(hex_color, factor=0.7):
    r = int(hex_color[1:3], 16)
    g = int(hex_color[3:5], 16)
    b = int(hex_color[5:7], 16)
    return '#{:02X}{:02X}{:02X}'.format(int(r * factor), int(g * factor), int(b * factor))


def main():
    os.makedirs(OUT, exist_ok=True)
    count = 0
    for filename, label in FILES.items():
        prefix = filename.split('-')[0]
        color, (w, h) = THEME[prefix]
        svg = SVG_TPL.format(
            w=w, h=h, c1=color, c2=darken(color),
            label=label,
            fs=int(min(w, h) * 0.11),
            fs2=int(min(w, h) * 0.045),
        )
        with open(os.path.join(OUT, filename), 'w', encoding='utf-8') as f:
            f.write(svg)
        count += 1
    print(f'生成 {count} 张占位图 -> {OUT}')


if __name__ == '__main__':
    main()
