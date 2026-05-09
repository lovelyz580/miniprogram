# 爪印记忆 - 微信小程序

    "pages/record/daily-question/daily-question",
		"pages/record/question-history/question-history",
    "pages/record/question-calendar/question-calendar",
    // {
      //   "pagePath": "pages/health/index",
      //   "text": "健康",
      //   "iconPath": "assets/icons/health.png",
      //   "selectedIconPath": "assets/icons/health-active.png"
      // },
 {
        "pagePath": "pages/reminder/index",
        "text": "提醒",
        "iconPath": "assets/icons/reminder.png",
        "selectedIconPath": "assets/icons/reminder-active.png"
      },
			      {
        "pagePath": "pages/record/list/list",
        "text": "乐园",
        "iconPath": "assets/icons/record.png",
        "selectedIconPath": "assets/icons/record-active.png"
      },



## 项目结构

```
miniprogram/
├── pages/                    # 页面文件
│   ├── index/               # 首页（时光轴）
│   │   ├── index.wxml       # 页面结构
│   │   ├── index.wxss       # 页面样式
│   │   ├── index.js         # 页面逻辑
│   │   └── index.json       # 页面配置
│   │
│   ├── record/              # 记录相关页面
│   │   ├── mood-bubble/     # 心情气泡发布 ⭐ P0
│   │   ├── diary/           # 写日记
│   │   ├── daily-question/  # 今日问答
│   │   ├── milestone/       # 里程碑记录
│   │   ├── detail/          # 记录详情
│   │   └── list/            # 记录列表
│   │
│   ├── health/              # 健康档案页面
│   │   ├── index/           # 健康首页
│   │   ├── vaccine/         # 疫苗记录
│   │   ├── checkup/         # 体检记录
│   │   ├── medication/      # 用药记录
│   │   └── weight/          # 体重记录
│   │
│   ├── reminder/            # 提醒页面
│   │   └── index/           # 提醒管理
│   │
│   ├── profile/             # 个人中心
│   │   ├── index/           # 我的页面
│   │   └── settings/        # 设置页面
│   │
│   ├── pet/                 # 宠物管理
│   │   ├── add/             # 添加宠物
│   │   └── edit/            # 编辑宠物
│   │
│   ├── memorial/            # 纪念模块
│   │   ├── album/           # 纪念册
│   │   └── memory-box/      # 记忆盒子
│   │
│   ├── login/               # 登录页面
│   │
│   └── webview/             # 网页容器
│
├── utils/                   # 工具函数
│   ├── request.js           # 网络请求封装
│   └── util.js              # 通用工具函数
│
├── assets/                  # 静态资源
│   ├── images/              # 图片
│   └── icons/               # 图标
│
├── app.js                   # 小程序入口
├── app.json                 # 全局配置
├── app.wxss                 # 全局样式
└── sitemap.json             # 站点地图
```

## 已完成页面

### P0 页面（已完成）

| 页面 | 路径 | 文件 |
|------|------|------|
| 首页（时光轴） | pages/index/index | ✅ wxml/wxss/js/json |
| 心情气泡发布 | pages/record/mood-bubble | ✅ wxml/wxss/js/json |

### 公共文件（已完成）

| 文件 | 说明 |
|------|------|
| app.js | 小程序入口文件 |
| app.json | 全局配置 |
| utils/request.js | 网络请求封装 |
| utils/util.js | 工具函数 |

## 使用说明

### 1. 导入项目

1. 下载微信开发者工具
2. 创建新项目，选择「小程序」
3. 将 `miniprogram` 目录下的文件复制到项目中
4. 修改 `app.js` 中的 `baseUrl` 为你的后端地址

### 2. 配置服务器

在微信公众平台 → 开发管理 → 开发设置 → 服务器域名中配置：

- request 合法域名：你的API域名
- uploadFile 合法域名：你的文件上传域名
- downloadFile 合法域名：你的文件下载域名

### 3. 安装依赖

本项目为原生小程序开发，无需安装额外依赖。

### 4. 准备资源

需要准备以下图标资源（放置在 `assets/icons/` 目录）：

```
assets/icons/
├── home.png              # 首页图标
├── home-active.png       # 首页选中图标
├── health.png            # 健康图标
├── health-active.png     # 健康选中图标
├── record.png            # 记录图标
├── record-active.png     # 记录选中图标
├── reminder.png          # 提醒图标
├── reminder-active.png   # 提醒选中图标
├── profile.png           # 我的图标
└── profile-active.png    # 我的选中图标
```

图标建议尺寸：81px × 81px

### 5. 准备图片资源

需要准备以下图片资源（放置在 `assets/images/` 目录）：

```
assets/images/
├── default-avatar.png    # 默认用户头像
├── default-pet.png       # 默认宠物头像
└── empty-record.png      # 空状态图片
```

## API 接口说明

### 首页相关

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/pet/list | GET | 获取宠物列表 |
| /api/pet/detail/:id | GET | 获取宠物详情 |
| /api/reminder/upcoming | GET | 获取即将到期的提醒 |
| /api/timeline/list | GET | 获取时光轴记录列表 |
| /api/timeline/like | POST | 点赞/取消点赞 |

### 心情气泡发布

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/upload | POST | 上传文件 |
| /api/timeline/create | POST | 创建记录 |
| /api/location/reverse | GET | 逆地理编码 |
| /api/weather/current | GET | 获取当前天气 |

### 数据格式参考

详见 `数据库设计-MySQL建表语句.sql`

## 待完成页面

按优先级排序：

### P1 页面

- [ ] 健康档案首页
- [ ] 疫苗记录
- [ ] 体检记录
- [ ] 体重记录
- [ ] 提醒管理
- [ ] 我的页面

### P2 页面

- [ ] 写日记
- [ ] 今日问答
- [ ] 里程碑记录
- [ ] 记录详情
- [ ] 添加/编辑宠物
- [ ] 纪念册
- [ ] 记忆盒子

## 开发规范

### 命名规范

- 页面目录：小写字母，用中划线连接，如 `mood-bubble`
- 文件名：与目录名一致，如 `mood-bubble.wxml`
- 变量名：驼峰命名，如 `currentPet`
- 函数名：驼峰命名，如 `getUserInfo`
- CSS类名：中划线连接，如 `mood-tag`

### 样式规范

- 使用 rpx 单位（1px = 2rpx）
- 主色调：#3366CC
- 背景色：#F5F7FA
- 文字颜色：#333333 / #666666 / #999999
- 边框颜色：#EEEEEE / #F0F0F0

### 代码规范

- 使用 ES6+ 语法
- 使用 async/await 处理异步
- 函数添加注释说明
- 统一错误处理

## 联系方式

如有问题，请联系开发者。

---

*创建时间：2026年4月10日*
