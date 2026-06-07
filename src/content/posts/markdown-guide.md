---
title: "Markdown 扩展语法指南"
published: 2026-05-28
description: "本文展示博客支持的各种 Markdown 扩展语法，包括代码块、数学公式、表格、Github 提示框等。"
tags: ["Markdown", "教程"]
category: "技术"
---

## 代码块语法高亮

支持多种语言的语法高亮，通过 Shiki 实现：

```python
def fibonacci(n: int) -> int:
    """计算第 n 个斐波那契数"""
    if n <= 1:
        return n
    a, b = 0, 1
    for _ in range(n - 1):
        a, b = b, a + b
    return b

# 打印前 10 个斐波那契数
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")
```

```typescript
interface BlogPost {
  title: string;
  published: Date;
  tags: string[];
  content: string;
}

function formatPost(post: BlogPost): string {
  return `[${post.published.toISOString()}] ${post.title}`;
}
```

## 数学公式 (KaTeX)

内联公式：$E = mc^2$

块级公式：

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

矩阵表示：

$$
\begin{bmatrix}
a & b \\
c & d
\end{bmatrix}
\begin{bmatrix}
x \\
y
\end{bmatrix}
=
\begin{bmatrix}
ax + by \\
cx + dy
\end{bmatrix}
$$

## 表格

| 框架 | 构建工具 | 渲染模式 | 适用场景 |
|------|----------|----------|----------|
| Astro | Vite | SSG/SSR | 内容网站 |
| Next.js | Turbopack | SSR/SSG | 全栈应用 |
| Nuxt | Vite | SSR/SSG | Vue 全栈 |
| SvelteKit | Vite | SSR/SSG | Svelte 全栈 |

## 引用和提示

> 这是一段引用文本。可以包含**粗体**、*斜体*等格式。

嵌套引用：

> 外层引用
>> 内层引用
>>> 更深层的引用

## 任务列表

- [x] 搭建博客框架
- [x] 配置主题与样式
- [x] 添加搜索功能
- [ ] 接入评论系统
- [ ] 添加友链页面

## 图片

![占位图](https://picsum.photos/800/400)

## 分割线

---

以上就是本博客支持的 Markdown 扩展语法。

---

> **提示**: 在 VSCode 中安装 MDX 插件可以获得更好的编辑体验。
