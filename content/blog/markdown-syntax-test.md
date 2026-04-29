---
title: 🧪 Markdown 语法测试
date: 2026-04-21
summary: 用一篇文章集中验证标题、列表、表格、代码块、图片等 Markdown 能力是否渲染正常。
tags:
  - Markdown
  - 测试
cover: /logo.png
---

这是一篇用于测试 Markdown 各种语法渲染效果的文章。

## 一、标题层级

# H1 一级标题
## H2 二级标题
### H3 三级标题
#### H4 四级标题
##### H5 五级标题
###### H6 六级标题

## 二、文本样式

这是一段普通段落，支持 **加粗**、*斜体*、***粗斜体***、~~删除线~~，还有 `行内代码`。

还支持 [外部链接](https://nextjs.org)、[站内链接](/about) 和一些表情 🎉🌱🐟。

## 三、列表

### 无序列表

- 苹果
- 香蕉
  - 小香蕉
  - 大香蕉
- 橘子

### 有序列表

1. 起床
2. 刷牙
3. 吃早餐
   1. 包子
   2. 豆浆
4. 出门

### 任务列表（GFM）

- [x] 初始化项目
- [x] 接入 Supabase
- [ ] 写完所有日志
- [ ] 上线 PWA

## 四、引用

> 千里之行，始于足下。
>
> —— 老子《道德经》

### 嵌套引用

> 这是第一层引用
>
> > 这是第二层引用
> >
> > > 这是第三层引用

## 五、代码

行内代码：`const a = 1;`

### TypeScript 代码块

```ts
// 一个简单的问候函数
function greet(name: string): string {
  return `你好，${name}！`;
}

console.log(greet('鱼蛋宝宝'));
```

### Bash 代码块

```bash
npm install
npm run dev
```

### JSON 代码块

```json
{
  "title": "文章标题",
  "date": "2026-04-29"
}
```

### 带行号的代码块

```ts {1,3-5}
// 第 1 行会被高亮
const a = 1;
// 第 3-5 行会被高亮
const b = 2;
const c = 3;
const d = 4;
```

## 六、分割线

---

***

___

## 七、表格（GFM）

| 模块       | 状态    | 进度 |
| ---------- | ------- | ---: |
| 账本       | ✅ 上线 | 100% |
| 成长 Log   | ✅ 上线 | 100% |
| PWA 支持   | 🚧 中    |  80% |
| 博客       | 🔨 开发中 |  60% |

## 八、图片

![logo](/logo.png)

### 带链接的图片

[![logo](/logo.png)](https://nextjs.org)

## 九、转义字符

\*这不是斜体\*　\`这不是代码\`

## 十、HTML 原生支持

<details>
<summary>点击展开更多内容</summary>

这里是一些被折叠的内容，使用 HTML 的 `<details>` 标签实现。

```ts
const hidden = "你发现了隐藏内容！";
```

</details>

## 十一、组合示例

> **提示：** 在 `content/blog/` 目录下新建 `.md` 文件即可添加新日志，frontmatter 支持 `title` 和 `date` 字段。

| 步骤 | 操作 | 命令 |
| --- | --- | --- |
| 1 | 创建文件 | `touch content/blog/new-post.md` |
| 2 | 编写内容 | 填写 frontmatter 和正文 |
| 3 | 本地预览 | `npm run dev` |
| 4 | 部署上线 | `git push` |

---

*以上就是常见的 Markdown 语法啦 ✨*
