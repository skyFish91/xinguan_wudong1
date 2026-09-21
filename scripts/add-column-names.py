# -*- coding: utf-8 -*-
"""为实体 @Column 系列装饰器自动补充 name: 'snake_case'（与 DDL 列名对齐）"""
import os
import re

ENTITY_DIR = os.path.join(os.path.dirname(__file__), '..', 'server', 'src', 'entity')


def snake(s):
    return re.sub(r'(?<!^)(?=[A-Z])', '_', s).lower()


def process_file(path):
    with open(path, encoding='utf-8') as f:
        text = f.read()

    out = []
    i = 0
    n = len(text)
    changed = 0
    decorator_names = ('Column', 'CreateDateColumn', 'UpdateDateColumn', 'PrimaryGeneratedColumn')

    while i < n:
        # 找装饰器
        m = re.match(r'@(Column|CreateDateColumn|UpdateDateColumn|PrimaryGeneratedColumn)', text[i:])
        if m and (i == 0 or text[i-1] != '.'):
            dname = m.group(1)
            j = i + len(m.group(0))
            # 可选括号
            start = j
            if j < n and text[j] == '(':
                depth = 0
                k = j
                while k < n:
                    if text[k] == '(':
                        depth += 1
                    elif text[k] == ')':
                        depth -= 1
                        if depth == 0:
                            break
                    k += 1
                args = text[j:k+1]
                inner = text[j+1:k]
                end = k + 1
            else:
                args = ''
                inner = ''
                end = j

            # 读取属性名
            k2 = end
            while k2 < n and (text[k2].isspace() or text[k2] in '/,'):
                k2 += 1
            prop_m = re.match(r'(\w+)', text[k2:])
            prop = prop_m.group(1) if prop_m else ''

            if prop:
                col_name = snake(prop)
                inner_stripped = inner.strip()
                # 跳过已有 name 的
                has_name = re.search(r'name\s*:', inner) is not None
                # PrimaryGeneratedColumn 列名恒为 id，无需处理
                is_pk = dname == 'PrimaryGeneratedColumn'
                # PrimaryGeneratedColumn('increment') 首参数是字符串
                first_is_str = inner_stripped.startswith(("'", '"'))
                if not has_name and not is_pk and not first_is_str:
                    if inner_stripped:
                        # 在 { 后插入
                        new_inner = '{ name: %r, %s' % (col_name, inner_stripped[1:])
                    else:
                        new_inner = '{ name: %r }' % col_name
                    out.append(text[i:j+1] + new_inner + ')')
                    i = end
                    changed += 1
                    continue

            out.append(text[i:end])
            i = end
        else:
            out.append(text[i])
            i += 1

    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(''.join(out))
    return changed


def main():
    total = 0
    for fn in sorted(os.listdir(ENTITY_DIR)):
        if fn.endswith('.entity.ts'):
            c = process_file(os.path.join(ENTITY_DIR, fn))
            print(f'{fn}: {c} 处')
            total += c
    print(f'合计 {total} 处')


if __name__ == '__main__':
    main()
