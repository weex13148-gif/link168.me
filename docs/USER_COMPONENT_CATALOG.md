# Link168 V2 用户组件目录（USER_COMPONENT_CATALOG）

> 文档版本：v2.0.0  
> 基线日期：2026-07-05  
> 维护团队：Link168 V2 文档总控团队 / Agent E  
> 状态：生产基线快照，所有事实以 `src/components/share/modules/`、`src/features/profile-modules/registry.ts`、`src/components/share/SharePageRenderer.tsx` 当前实现为准。

---

## 1. 文档目标与适用范围

### 1.1 文档目标
本文档是 Link168 V2 公开主页（用户可见的 `/{username}` 分享页）组件体系的**唯一权威目录**，目标是：

1. 统一记录当前已上线的全部用户可用组件，避免多份文档对同一组件描述不一致。
2. 为产品、设计、前端、后端、运营提供同一份组件事实基线，作为后续改版、套餐调整、A/B 实验、合规审计的共同依据。
3. 明确每一个组件的：组件代码、用户价值、编辑字段、必填项、公开展示规则、移动端行为、统计事件、套餐权限、隐私风险、依赖与验收标准。
4. 明确公开页的目标结构（品牌封面与身份卡、快捷动作、产品与服务、精选内容、AI 接待、留资与转人工、品牌页脚、合规与举报）。
5. 明确 AI 组件显示的 6 项前置条件，确保免费用户公开页**不得产生真实 AI 调用**。
6. 明确未开启 AI 时的首屏优先展示策略，保证基本可用性与转化效率。

### 1.2 适用范围
- **适用对象**：Link168 公开主页（`/{username}` 路由）渲染的所有用户可配置组件。
- **适用读者**：产品经理、UX 设计师、前端工程师、后端工程师、QA、运营、合规审计、客服。
- **不适用**：管理后台（Jeepwork）、控制台（Workbench）、AI 安全测试、Showcase 路演等内部能力组件，这些由各自专属文档维护。
- **不适用**：V1 旧版 `dashboard-v1` 目录下的编辑态组件（仅作历史归档）。

### 1.3 与其他文档的关系
- 与 `UI_ARCHITECTURE.md` 互补：本文档聚焦组件本身，UI 架构聚焦整体页面骨架。
- 与 `PRICING_AND_ENTITLEMENTS.md` 互补：本文档标注套餐权限范围，详细套餐矩阵以定价文档为准。
- 与 `SHOWCASE_AND_DEMO.md` 互补：Showcase 路演页不在本文档范围。

---

## 2. 当前组件事实基线（2026-07-05）

### 2.1 已实现组件文件清单（13 个）

位于 `src/components/share/modules/`，共 13 个文件，全部为生产已上线状态【已实现】：

| # | 文件名 | 组件中文名 | 状态 | 说明 |
|---|--------|------------|------|------|
| 1 | `AiChatModule.tsx` | AI 对话模块 | 【已实现】 | 公开页 AI 接待入口，含隐私提示与举报入口 |
| 2 | `BilibiliVideoModule.tsx` | B 站视频 | 【已实现】 | 嵌入哔哩哔哩视频（基于 bvid） |
| 3 | `CarouselModule.tsx` | 轮播图 | 【已实现】 | 多图轮播展示，可配置链接 |
| 4 | `CopyTextModule.tsx` | 复制文本 | 【已实现】 | 一键复制指定文本到剪贴板 |
| 5 | `CoverImageModule.tsx` | 封面图 | 【已实现】 | 大图封面展示，可附跳转链接 |
| 6 | `DividerModule.tsx` | 分隔线 | 【已实现】 | 视觉分隔，支持 line / space 两种样式 |
| 7 | `ModuleFallback.tsx` | 模块降级回退 | 【已实现】 | 模块数据为空 / 类型未知 / 校验失败时的统一降级 UI |
| 8 | `MusicLinkModule.tsx` | 通用音乐链接 | 【已实现】 | 通用音乐外链卡片 |
| 9 | `NeteaseMusicModule.tsx` | 网易云音乐 | 【已实现】 | 嵌入网易云歌曲（基于 songId） |
| 10 | `PopupImageModule.tsx` | 点击放大图 | 【已实现】 | 缩略图点击全屏放大 |
| 11 | `SafeImage.tsx` | 安全图片组件 | 【已实现】 | 图片审核状态校验与降级占位 |
| 12 | `VideoLinkModule.tsx` | 通用视频链接 | 【已实现】 | 通用视频外链卡片 |
| 13 | `YoutubeVideoModule.tsx` | YouTube 视频 | 【已实现】 | 嵌入 YouTube 视频（基于 videoId） |

### 2.2 已实现模块类型清单（20 种）

模块注册表 `src/features/profile-modules/registry.ts` 中通过 `Link` 表 `type` 字段区分，当前共 20 种【已实现】：

| # | 模块代码（基线命名） | 中文名 | 分类 | 免费可用 | 状态 |
|---|----------------------|--------|------|----------|------|
| 1 | `link` | 链接 | 联系与快捷动作 | 是 | 【已实现】 |
| 2 | `text` | 文本 | 内容展示 | 是 | 【已实现】 |
| 3 | `group_title` | 分组标题 | 内容展示 | 是 | 【已实现】 |
| 4 | `qr` | 二维码 | 联系与快捷动作 | 是 | 【已实现】 |
| 5 | `wechat` | 微信 | 联系与快捷动作 | 是 | 【已实现】 |
| 6 | `phone` | 电话 | 联系与快捷动作 | 是 | 【已实现】 |
| 7 | `map` | 地图 | 联系与快捷动作 | 是 | 【已实现】 |
| 8 | `copy_text` | 复制文本 | 内容展示 | 是 | 【已实现】 |
| 9 | `divider` | 分隔线 | 内容展示 | 是 | 【已实现】 |
| 10 | `product` | 商品 / 服务 | 商业转化 | 否 | 【已实现】 |
| 11 | `appointment` | 预约 | 线索 | 否 | 【已实现】 |
| 12 | `cover_image` | 封面图 | 内容展示 | 否 | 【已实现】 |
| 13 | `popup_image` | 点击放大图 | 内容展示 | 否 | 【已实现】 |
| 14 | `carousel` | 轮播图 | 内容展示 | 否 | 【已实现】 |
| 15 | `bilibili_video` | B 站视频 | 内容展示 | 否 | 【已实现】 |
| 16 | `youtube_video` | YouTube 视频 | 内容展示 | 否 | 【已实现】 |
| 17 | `video_link` | 通用视频 | 内容展示 | 否 | 【已实现】 |
| 18 | `netease_music` | 网易云音乐 | 内容展示 | 否 | 【已实现】 |
| 19 | `music_link` | 通用音乐 | 内容展示 | 否 | 【已实现】 |
| 20 | `ai_chat` | AI 对话 | AI | 否 | 【已实现】 |

> 注：模块代码在本目录中统一采用下划线命名（如 `group_title`、`cover_image`），与代码库 `registry.ts` 中的 kebab-case 标识（如 `group-title`、`cover-image`）一一对应；商品 / 服务模块代码库内标识为 `shop`，预约模块代码库内标识为 `booking`，本目录以业务语义命名 `product` / `appointment` 为准，下同。

### 2.3 渲染器与模板

- **渲染器**：`src/components/share/SharePageRenderer.tsx`，统一渲染入口 `SharePageRenderer`。
- **模板（3 套）**：
  - `business`（默认）：商务名片风，头像居中，卡片化身份卡。
  - `creator`：创作者风，大头像 + 软阴影，强调个人 IP。
  - `conversion`：转化风，头像左对齐，信息密度高，强调 CTA。
- **降级组件**：`ModuleFallback`，统一处理 payload 为空、类型未知、校验失败三类降级场景。
- **图片安全组件**：`SafeImage`，统一校验图片可信域名与审核状态。

---

## 3. 组件分类体系（8 类）

Link168 V2 将所有公开页组件划分为以下 8 类，覆盖身份、联系、内容、转化、线索、AI、信任、渠道全链路：

| 分类编号 | 分类名称 | 覆盖范围 | 包含模块（按基线命名） |
|----------|----------|----------|------------------------|
| C1 | 身份与品牌 | 公开页顶部身份卡、头像、品牌名、简介、品牌封面 | （由身份卡渲染，非模块化组件；封面图 `cover_image` 兼具身份属性） |
| C2 | 联系与快捷动作 | 一键联系、扫码、复制、地图导航 | `link`、`qr`、`wechat`、`phone`、`map`、`copy_text` |
| C3 | 内容展示 | 图文、视频、音频、分组、分隔 | `text`、`group_title`、`divider`、`cover_image`、`popup_image`、`carousel`、`bilibili_video`、`youtube_video`、`video_link`、`netease_music`、`music_link` |
| C4 | 商业转化 | 商品 / 服务展示与跳转 | `product` |
| C5 | 线索 | 在线预约、留资、转人工 | `appointment` |
| C6 | AI | AI 智能接待与转化 | `ai_chat` |
| C7 | 信任与合规 | 隐私提示、举报、品牌页脚、AI 内容声明 | 由渲染器与 `AiChatModule` 内嵌提供，非独立模块 |
| C8 | 渠道与营销 | 分享、二维码下载、vCard 保存、统计归因 | 由渲染器顶部 `HeaderActions` 与底部 `BrandFoot` 提供，非独立模块 |

---

## 4. 每个组件详细定义

> 字段说明：组件名称、组件代码、组件分类、用户价值、当前状态、编辑字段、默认值、必填项、公开展示、移动端行为、统计事件、套餐权限、隐私风险、依赖、验收标准。

### 4.1 链接 `link`

| 字段 | 值 |
|------|----|
| 组件名称 | 链接 |
| 组件代码 | `link` |
| 组件分类 | C2 联系与快捷动作 |
| 用户价值 | 用户主页最基础的外链入口，承载官网、活动页、博客、社交账号等任意 HTTPS 跳转。 |
| 当前状态 | 【已实现】 |
| 编辑字段 | `title`（标题）、`url`（跳转地址）、`description`（描述，可选）、`icon`（图标，可选，支持图片 URL 或单字符 Emoji） |
| 默认值 | `title` = "链接"、`description` = 空、`icon` = 默认地球图标 |
| 必填项 | `title`、`url` |
| 公开展示 | 卡片式按钮，标题加粗 + 描述灰字两行截断 + 右上箭头，target=`_blank` |
| 移动端行为 | 最小高度 56px，点击区域满足 44×44pt，长按可复制链接 |
| 统计事件 | `share_link_click`（含 link_id、username、template） |
| 套餐权限 | 免费可用 |
| 隐私风险 | 低；URL 经 `sanitizePublicUrl` 白名单校验，禁止 `javascript:` / `data:` / `vbscript:` / `file:` |
| 依赖 | `sanitizePublicUrl`、`renderLinkIcon` |
| 验收标准 | ① URL 不安全时降级为不可点击的红色提示卡片 ② 标题超长截断 ③ 新窗口打开带 `rel="noopener noreferrer"` |

### 4.2 文本 `text`

| 字段 | 值 |
|------|----|
| 组件名称 | 文本 |
| 组件代码 | `text` |
| 组件分类 | C3 内容展示 |
| 用户价值 | 用于补充说明、公告、自我介绍、品牌故事等非链接型内容。 |
| 当前状态 | 【已实现】 |
| 编辑字段 | `title`（标题，可选）、`description`（正文，可选） |
| 默认值 | 均为空 |
| 必填项 | `title` 或 `description` 至少一项 |
| 公开展示 | 卡片化文本块，标题加粗 + 正文灰字两行截断 |
| 移动端行为 | 最小高度 44px，自适应高度 |
| 统计事件 | `share_text_view`（曝光） |
| 套餐权限 | 免费可用 |
| 隐私风险 | 低；纯展示，无跳转 |
| 依赖 | 无外部依赖 |
| 验收标准 | ① 标题与正文均为空时不渲染 ② 不解析 HTML，防 XSS |

### 4.3 分组标题 `group_title`

| 字段 | 值 |
|------|----|
| 组件名称 | 分组标题 |
| 组件代码 | `group_title` |
| 组件分类 | C3 内容展示 |
| 用户价值 | 对公开页内容进行结构化分组，例如「精选内容」「联系方式」「服务介绍」。 |
| 当前状态 | 【已实现】 |
| 编辑字段 | `title`（分组名） |
| 默认值 | `title` = "分组" |
| 必填项 | `title` |
| 公开展示 | 居中线条 + 大写字母间距标题 + 线条三段式分隔 |
| 移动端行为 | 高度 32px，纯视觉元素 |
| 统计事件 | 无（视觉分组，不单独统计） |
| 套餐权限 | 免费可用 |
| 隐私风险 | 无 |
| 依赖 | 无 |
| 验收标准 | ① 标题为空时显示 "分组" ② 不参与点击交互 |

### 4.4 二维码 `qr`

| 字段 | 值 |
|------|----|
| 组件名称 | 二维码 |
| 组件代码 | `qr` |
| 组件分类 | C2 联系与快捷动作 |
| 用户价值 | 引导扫码加好友、加群、跳转小程序或活动页。 |
| 当前状态 | 【已实现】 |
| 编辑字段 | `title`、`url`（扫码后跳转地址）、`description`（可选） |
| 默认值 | `title` = "扫码查看" |
| 必填项 | `url` |
| 公开展示 | 卡片 + 二维码图标 + 标题 + 描述 + 右上箭头 |
| 移动端行为 | 点击新窗口打开 url；顶部 `HeaderActions` 的二维码按钮触发 `QrCodeModal` 弹窗 |
| 统计事件 | `share_qr_click` |
| 套餐权限 | 免费可用 |
| 隐私风险 | 中；URL 经 `sanitizePublicUrl` 校验，不安全时降级为红色提示 |
| 依赖 | `QrCodeModal`、`sanitizePublicUrl` |
| 验收标准 | ① 不安全 URL 不渲染可点击 href ② Modal 弹窗含下载与保存按钮 |

### 4.5 微信 `wechat`

| 字段 | 值 |
|------|----|
| 组件名称 | 微信 |
| 组件代码 | `wechat` |
| 组件分类 | C2 联系与快捷动作 |
| 用户价值 | 引导访客添加微信，是私域转化的核心入口。 |
| 当前状态 | 【已实现】 |
| 编辑字段 | `title`、`wechat_id`（微信号，payload 字段）、`description`（可选） |
| 默认值 | `title` = "微信联系" |
| 必填项 | `wechat_id` |
| 公开展示 | 卡片 + 微信图标 + 标题 + "微信号：xxx" + "微信" 标签 |
| 移动端行为 | 点击复制微信号到剪贴板（`navigator.clipboard`），最小高度 56px |
| 统计事件 | `share_wechat_copy` |
| 套餐权限 | 免费可用 |
| 隐私风险 | 中；微信号明文展示，需用户主动开启 |
| 依赖 | `navigator.clipboard` |
| 验收标准 | ① 复制成功有视觉反馈 ② 微信号为空时显示描述文案 |

### 4.6 电话 `phone`

| 字段 | 值 |
|------|----|
| 组件名称 | 电话 |
| 组件代码 | `phone` |
| 组件分类 | C2 联系与快捷动作 |
| 用户价值 | 一键拨打电话，适用于服务咨询、紧急联系场景。 |
| 当前状态 | 【已实现】 |
| 编辑字段 | `title`、`phone`（payload 字段，电话号码） |
| 默认值 | `title` = "电话联系" |
| 必填项 | `phone` |
| 公开展示 | 卡片 + 电话图标 + 标题 + 号码 + 右上箭头，href=`tel:{phone}` |
| 移动端行为 | 点击拉起系统拨号面板 |
| 统计事件 | `share_phone_click` |
| 套餐权限 | 免费可用 |
| 隐私风险 | 中；号码明文，需用户主动开启 |
| 依赖 | `sanitizePhoneNumber` |
| 验收标准 | ① 号码格式不正确时降级为红色提示 ② 不安全字符过滤 |

### 4.7 地图 `map`

| 字段 | 值 |
|------|----|
| 组件名称 | 地图 |
| 组件代码 | `map` |
| 组件分类 | C2 联系与快捷动作 |
| 用户价值 | 展示线下门店、办公地点，引导到店导航。 |
| 当前状态 | 【已实现】 |
| 编辑字段 | `title`、`map`（payload 字段，地图链接）、`address`（payload 字段，地址文本，可选） |
| 默认值 | `title` = "地图位置" |
| 必填项 | `map` |
| 公开展示 | 卡片 + 地图图标 + 标题 + 地址 + 右上箭头 |
| 移动端行为 | 点击新窗口打开地图链接（高德 / 百度 / 腾讯地图） |
| 统计事件 | `share_map_click` |
| 套餐权限 | 免费可用 |
| 隐私风险 | 中；地址信息明文 |
| 依赖 | `sanitizeMapUrl` |
| 验收标准 | ① 地图链接不安全时降级 ② 地址优先于 description 展示 |

### 4.8 复制文本 `copy_text`

| 字段 | 值 |
|------|----|
| 组件名称 | 复制文本 |
| 组件代码 | `copy_text` |
| 组件分类 | C3 内容展示 |
| 用户价值 | 一键复制指定文本（如口令、密码、地址、银行账号、优惠码）。 |
| 当前状态 | 【已实现】 |
| 编辑字段 | `label`（按钮文案）、`copyContent`（待复制内容）、`description`（描述，可选） |
| 默认值 | `label` = "复制" |
| 必填项 | `label`、`copyContent` |
| 公开展示 | 卡片 + 复制图标 + label + 描述 + 复制按钮 |
| 移动端行为 | 点击调用 `navigator.clipboard.writeText`，触发"已复制"提示 |
| 统计事件 | `share_copy_text` |
| 套餐权限 | 免费可用 |
| 隐私风险 | 中；待复制内容明文，用户应自行评估敏感信息 |
| 依赖 | `CopyTextModule`、`navigator.clipboard` |
| 验收标准 | ① 复制成功有 toast 反馈 ② copyContent 为空时不渲染 |

### 4.9 分隔线 `divider`

| 字段 | 值 |
|------|----|
| 组件名称 | 分隔线 |
| 组件代码 | `divider` |
| 组件分类 | C3 内容展示 |
| 用户价值 | 视觉分隔不同模块，提升信息层次感。 |
| 当前状态 | 【已实现】 |
| 编辑字段 | `style`（可选，`line` 或 `space`） |
| 默认值 | `style` = `line` |
| 必填项 | 无 |
| 公开展示 | `line` 为水平细线；`space` 为空白间距 |
| 移动端行为 | 高度 1px 或 16px，纯视觉 |
| 统计事件 | 无 |
| 套餐权限 | 免费可用 |
| 隐私风险 | 无 |
| 依赖 | `DividerModule` |
| 验收标准 | ① style 值非法时降级为 `line` ② 不参与点击 |

### 4.10 商品 / 服务 `product`

| 字段 | 值 |
|------|----|
| 组件名称 | 商品 / 服务 |
| 组件代码 | `product` |
| 组件分类 | C4 商业转化 |
| 用户价值 | 展示商品或服务卡片，引导跳转购买 / 详情页，是商业转化的核心组件。 |
| 当前状态 | 【已实现】 |
| 编辑字段 | `title`、`url`（详情页地址）、`description`（可选）、`price`（payload 字段，价格，可选） |
| 默认值 | `title` = "商品 / 服务" |
| 必填项 | `title`、`url` |
| 公开展示 | 卡片 + 购物袋图标 + 标题 + 描述 + 价格（红色加粗）/ 箭头 |
| 移动端行为 | 点击新窗口打开 url，最小高度 56px |
| 统计事件 | `share_product_click`（含 price、link_id） |
| 套餐权限 | 付费（非免费） |
| 隐私风险 | 中；URL 经 `sanitizePublicUrl` 校验 |
| 依赖 | `sanitizePublicUrl`、与 Workbench `ProductsClient` 数据联动 |
| 验收标准 | ① 不安全 URL 降级 ② 价格字段优先于箭头展示 ③ 付费套餐校验 |

### 4.11 预约 `appointment`

| 字段 | 值 |
|------|----|
| 组件名称 | 预约 |
| 组件代码 | `appointment` |
| 组件分类 | C5 线索 |
| 用户价值 | 在线预约咨询，收集访客联系方式，是线索获取的核心组件。 |
| 当前状态 | 【已实现】 |
| 编辑字段 | `title`、`url`（预约表单地址）、`description`（可选）、`time`（payload 字段，时间段，可选） |
| 默认值 | `title` = "预约咨询" |
| 必填项 | `title`、`url` |
| 公开展示 | 卡片 + 日历图标 + 标题 + 时间段 / 描述 + 右上箭头 |
| 移动端行为 | 点击新窗口打开预约表单 |
| 统计事件 | `share_appointment_click` |
| 套餐权限 | 付费（非免费） |
| 隐私风险 | 中；收集访客信息由跳转后的表单处理 |
| 依赖 | `sanitizePublicUrl`、与 Workbench `LeadsClient` 数据联动 |
| 验收标准 | ① 不安全 URL 降级 ② 时间段字段优先展示 ③ 付费套餐校验 |

### 4.12 封面图 `cover_image`

| 字段 | 值 |
|------|----|
| 组件名称 | 封面图 |
| 组件代码 | `cover_image` |
| 组件分类 | C3 内容展示（兼具 C1 身份属性） |
| 用户价值 | 大图封面，强化品牌视觉，可附跳转链接。 |
| 当前状态 | 【已实现】 |
| 编辑字段 | `imageUrl`（图片地址）、`alt`（可选，替代文本）、`linkUrl`（可选，跳转地址） |
| 默认值 | 无 |
| 必填项 | `imageUrl` |
| 公开展示 | 圆角大图，宽度 100%，高度自适应，含 `linkUrl` 时可点击跳转 |
| 移动端行为 | 图片懒加载，加载失败显示占位 |
| 统计事件 | `share_cover_image_view`、`share_cover_image_click`（含 linkUrl 时） |
| 套餐权限 | 付费（非免费） |
| 隐私风险 | 中；图片需通过 `isTrustedImageUrl` 可信域名校验 |
| 依赖 | `CoverImageModule`、`SafeImage`、`isTrustedImageUrl` |
| 验收标准 | ① 非可信域名图片校验失败 ② alt 为空时使用默认占位 ③ 加载错误降级 |

### 4.13 点击放大图 `popup_image`

| 字段 | 值 |
|------|----|
| 组件名称 | 点击放大图 |
| 组件代码 | `popup_image` |
| 组件分类 | C3 内容展示 |
| 用户价值 | 缩略图点击全屏放大查看，适用于作品集、证书、活动海报。 |
| 当前状态 | 【已实现】 |
| 编辑字段 | `thumbnailUrl`（缩略图地址）、`fullImageUrl`（全图地址）、`alt`（可选） |
| 默认值 | 无 |
| 必填项 | `thumbnailUrl`、`fullImageUrl` |
| 公开展示 | 缩略图卡片，点击弹出全屏遮罩 + 全图 |
| 移动端行为 | 点击放大，支持双指缩放，点击遮罩关闭 |
| 统计事件 | `share_popup_image_open` |
| 套餐权限 | 付费（非免费） |
| 隐私风险 | 中；图片需通过可信域名校验 |
| 依赖 | `PopupImageModule`、`SafeImage`、`isTrustedImageUrl` |
| 验收标准 | ① 两个 URL 均需可信校验 ② 全屏图支持关闭 ③ 加载失败降级 |

### 4.14 轮播图 `carousel`

| 字段 | 值 |
|------|----|
| 组件名称 | 轮播图 |
| 组件代码 | `carousel` |
| 组件分类 | C3 内容展示 |
| 用户价值 | 多图轮播展示，适用于产品图集、案例展示、活动合集。 |
| 当前状态 | 【已实现】 |
| 编辑字段 | `images`（数组，每项含 `imageUrl`、`alt` 可选、`linkUrl` 可选） |
| 默认值 | 无 |
| 必填项 | `images`（至少 1 项，每项 `imageUrl` 必填） |
| 公开展示 | 横向滑动轮播，含指示点，可附跳转链接 |
| 移动端行为 | 左右滑动切换，自动循环可选 |
| 统计事件 | `share_carousel_view`、`share_carousel_slide`、`share_carousel_click` |
| 套餐权限 | 付费（非免费） |
| 隐私风险 | 中；所有图片 URL 需可信校验 |
| 依赖 | `CarouselModule`、`SafeImage`、`isTrustedImageUrl` |
| 验收标准 | ① 空数组校验失败 ② 每项 imageUrl 可信校验 ③ 指示点与当前索引同步 |

### 4.15 B 站视频 `bilibili_video`

| 字段 | 值 |
|------|----|
| 组件名称 | B 站视频 |
| 组件代码 | `bilibili_video` |
| 组件分类 | C3 内容展示 |
| 用户价值 | 嵌入哔哩哔哩视频，用于内容营销、产品演示、品牌故事。 |
| 当前状态 | 【已实现】 |
| 编辑字段 | `bvid`（B 站视频 ID）、`title`（可选）、`coverUrl`（可选，封面图） |
| 默认值 | 无 |
| 必填项 | `bvid` |
| 公开展示 | 嵌入 B 站播放器 iframe，含封面与标题 |
| 移动端行为 | 全宽播放器，点击播放，支持全屏 |
| 统计事件 | `share_bilibili_play` |
| 套餐权限 | 付费（非免费） |
| 隐私风险 | 中；引入第三方 iframe，需 rel=noopener |
| 依赖 | `BilibiliVideoModule` |
| 验收标准 | ① bvid 格式校验 ② iframe sandbox 限制 ③ 加载失败降级 |

### 4.16 YouTube 视频 `youtube_video`

| 字段 | 值 |
|------|----|
| 组件名称 | YouTube 视频 |
| 组件代码 | `youtube_video` |
| 组件分类 | C3 内容展示 |
| 用户价值 | 嵌入 YouTube 视频，面向海外用户与跨境品牌。 |
| 当前状态 | 【已实现】 |
| 编辑字段 | `videoId`（YouTube 视频 ID）、`title`（可选）、`coverUrl`（可选） |
| 默认值 | 无 |
| 必填项 | `videoId` |
| 公开展示 | 嵌入 YouTube iframe 播放器 |
| 移动端行为 | 全宽播放器，支持全屏 |
| 统计事件 | `share_youtube_play` |
| 套餐权限 | 付费（非免费） |
| 隐私风险 | 中；引入 Google 域 iframe，GDPR 合规需提示 |
| 依赖 | `YoutubeVideoModule` |
| 验收标准 | ① videoId 格式校验 ② iframe sandbox ③ 加载失败降级 |

### 4.17 通用视频 `video_link`

| 字段 | 值 |
|------|----|
| 组件名称 | 通用视频 |
| 组件代码 | `video_link` |
| 组件分类 | C3 内容展示 |
| 用户价值 | 通用视频外链卡片，支持未在 B 站 / YouTube 的视频源。 |
| 当前状态 | 【已实现】 |
| 编辑字段 | `url`（视频地址）、`title`（可选）、`coverUrl`（可选）、`platform`（可选，平台标识） |
| 默认值 | 无 |
| 必填项 | `url` |
| 公开展示 | 卡片 + 视频图标 + 标题 + 封面（如有） |
| 移动端行为 | 点击新窗口打开 |
| 统计事件 | `share_video_link_click` |
| 套餐权限 | 付费（非免费） |
| 隐私风险 | 中；URL 经 `sanitizePublicUrl` 校验 |
| 依赖 | `VideoLinkModule`、`sanitizePublicUrl` |
| 验收标准 | ① 不安全 URL 降级 ② platform 字段仅作展示 |

### 4.18 网易云音乐 `netease_music`

| 字段 | 值 |
|------|----|
| 组件名称 | 网易云音乐 |
| 组件代码 | `netease_music` |
| 组件分类 | C3 内容展示 |
| 用户价值 | 嵌入网易云歌曲，适用于音乐人、播客、情感类主页。 |
| 当前状态 | 【已实现】 |
| 编辑字段 | `songId`（歌曲 ID）、`title`（可选）、`artist`（可选）、`coverUrl`（可选） |
| 默认值 | 无 |
| 必填项 | `songId` |
| 公开展示 | 嵌入网易云播放器 iframe |
| 移动端行为 | 全宽播放器，含播放控制 |
| 统计事件 | `share_netease_music_play` |
| 套餐权限 | 付费（非免费） |
| 隐私风险 | 中；引入第三方 iframe |
| 依赖 | `NeteaseMusicModule` |
| 验收标准 | ① songId 格式校验 ② iframe sandbox ③ 加载失败降级 |

### 4.19 通用音乐 `music_link`

| 字段 | 值 |
|------|----|
| 组件名称 | 通用音乐 |
| 组件代码 | `music_link` |
| 组件分类 | C3 内容展示 |
| 用户价值 | 通用音乐外链卡片，支持 QQ 音乐、Spotify、Apple Music 等未在网易云的音乐源。 |
| 当前状态 | 【已实现】 |
| 编辑字段 | `url`（音乐地址）、`title`（可选）、`artist`（可选）、`coverUrl`（可选） |
| 默认值 | 无 |
| 必填项 | `url` |
| 公开展示 | 卡片 + 音乐图标 + 标题 + 艺人 + 封面 |
| 移动端行为 | 点击新窗口打开 |
| 统计事件 | `share_music_link_click` |
| 套餐权限 | 付费（非免费） |
| 隐私风险 | 中；URL 经 `sanitizePublicUrl` 校验 |
| 依赖 | `MusicLinkModule`、`sanitizePublicUrl` |
| 验收标准 | ① 不安全 URL 降级 ② 艺人字段可选展示 |

### 4.20 AI 对话 `ai_chat`

| 字段 | 值 |
|------|----|
| 组件名称 | AI 对话 |
| 组件代码 | `ai_chat` |
| 组件分类 | C6 AI |
| 用户价值 | 7×24 小时 AI 智能接待，回答访客常见问题，引导留资与转化。 |
| 当前状态 | 【已实现】 |
| 编辑字段 | `assistantName`（助手名称，可选）、`greeting`（欢迎语，可选）、`tone`（语气，可选） |
| 默认值 | `assistantName` = "AI 接待"、`greeting` = "你好，有什么可以帮你的？" |
| 必填项 | 无（均有默认值） |
| 公开展示 | 对话卡片，含助手名称 + "AI 生成内容 · 仅供参考" 标签 + 隐私 / 举报按钮 + 消息列表 + 输入框 + "转人工" 按钮 |
| 移动端行为 | 消息列表最大高度 320px，自动滚到底部，输入框 maxLength=1000 |
| 统计事件 | `share_ai_chat_open`、`share_ai_chat_send`、`share_ai_chat_handoff`（转人工） |
| 套餐权限 | 付费（非免费）；免费用户公开页**不得产生真实 AI 调用** |
| 隐私风险 | 高；对话内容被记录用于服务改进，需明确隐私提示 |
| 依赖 | `AiChatModule`、`/api/ai/customer-service` 或 `/api/ai/sales-agent`、AI 套餐权限、AI 额度、知识资料、试聊测试、服务状态 |
| 验收标准 | ① 6 项前置条件全部满足才渲染可交互入口 ② 任一条件不满足降级为静态占位 ③ 隐私提示默认可见或可一键展开 ④ 举报入口可用 ⑤ 免费用户公开页不发起 `/api/ai/*` 真实调用 |

---

## 5. 公开页目标结构

Link168 V2 公开页目标结构按以下 8 个语义区块组织，3 套模板（business / creator / conversion）在视觉布局上有所差异，但语义区块保持一致：

| 区块编号 | 区块名称 | 默认位置 | 内容来源 | 当前状态 |
|----------|----------|----------|----------|----------|
| S1 | 品牌封面与身份卡 | 顶部 | 头像、显示名、职位 · 公司、@username、简介、品牌封面图（`cover_image`） | 【已实现】 |
| S2 | 快捷动作 | 身份卡右上 / 顶部 | 二维码按钮、分享按钮（`HeaderActions`） | 【已实现】 |
| S3 | 产品与服务 | 身份卡下方 | `product` 模块、`appointment` 模块 | 【已实现】 |
| S4 | 精选内容 | 中部 | `text`、`group_title`、`divider`、`cover_image`、`popup_image`、`carousel`、`bilibili_video`、`youtube_video`、`video_link`、`netease_music`、`music_link` | 【已实现】 |
| S5 | AI 接待 | 中下部 | `ai_chat` 模块（受 6 项前置条件约束） | 【已实现】 |
| S6 | 留资与转人工 | AI 接待下方 | `appointment`、`wechat`、`phone`、`map`、`copy_text` + "保存到通讯录" vCard 下载 | 【已实现】 |
| S7 | 品牌页脚 | 底部 | "由 Link168 提供" 品牌水印（`BrandFoot`）、`link` 模块 | 【已实现】 |
| S8 | 合规与举报 | 最底部 | "举报此主页" 链接（`reportUrl`）、AI 内容声明、隐私提示 | 【已实现】 |

### 5.1 联系方式区块（贯穿 S1 / S6）
- 由 `ContactInfoSection` 渲染，含电话、邮箱、微信（点击复制）、地址、官网、"保存到通讯录" vCard 下载。
- 受 `contactVisibility` 字段控制：`public` 显示，其他值隐藏并独立展示 vCard 下载入口。

### 5.2 空状态
- 当 `links` 数组为空时，渲染"主页正在搭建中"占位卡片，提示访客主人很快会添加内容。

---

## 6. AI 组件显示条件

`ai_chat` 模块的渲染与可交互性受以下 **6 项前置条件**约束，**全部满足**才会在公开页发起真实 AI 调用：

| 编号 | 条件 | 校验位置 | 不满足时行为 |
|------|------|----------|--------------|
| A1 | 套餐有权限 | 后端 `/api/ai/customer-service` 返回 `code: "MEMBERSHIP_REQUIRED"` | 前端显示"该主页暂未开通 AI 接待"提示 |
| A2 | 用户已开启 AI | 后端配置 `ai_enabled` 标志 | 同上 |
| A3 | 知识资料已配置 | 后端校验知识库非空 | 同上 |
| A4 | 试聊测试通过 | 后端 `ai-safety-tests` 校验 | 同上 |
| A5 | 额度可用 | 后端 `ai/credits` 校验 | 同上 |
| A6 | 服务状态正常 | 后端 `ai/gateway` 健康检查 | 前端显示"AI 接待暂时不可用，请稍后再试" |

### 6.1 免费用户保护
- **核心约束**：免费用户公开页**不得产生真实 AI 调用**。
- 实现方式：
  1. 后端 `/api/ai/customer-service` 与 `/api/ai/sales-agent` 在套餐校验阶段拒绝免费用户，返回 `code: "MEMBERSHIP_REQUIRED"`。
  2. 前端 `AiChatModule` 收到该 code 后显示"该主页暂未开通 AI 接待，你可以直接留下联系方式"。
  3. 生产环境保护脚本 `scripts/ai-test/production-guard.mjs` 防止误调用真实 AI。
- **允许**：免费用户可在控制台预览 AI 演示（showcase 模式），但公开页不得发起任何 `/api/ai/*` 真实调用。

### 6.2 降级策略
- 任一条件不满足时，`ai_chat` 模块降级为静态占位卡片，仅展示助手名称与欢迎语，不渲染输入框，不发起后端调用。
- 占位卡片仍可保留"转人工"按钮，引导访客通过 `wechat` / `phone` / `appointment` 留资。

---

## 7. 未开启 AI 时的首屏优先展示

当 AI 组件不可用（免费用户或前置条件未满足）时，公开页首屏优先展示以下内容，确保基本可用性与转化效率：

| 优先级 | 展示内容 | 推荐模块 | 说明 |
|--------|----------|----------|------|
| P1 | 产品 / 服务 | `product` | 商业转化的核心入口，优先展示 |
| P2 | 主要 CTA | `link`、`appointment` | 引导访客完成关键动作（购买、预约、咨询） |
| P3 | 联系方式 | `wechat`、`phone`、`map` | 引导私域沉淀与即时联系 |
| P4 | 案例 / 作品 | `carousel`、`popup_image`、`cover_image` | 建立信任，提升转化 |
| P5 | 资料 / 介绍 | `text`、`group_title`、`divider` | 补充品牌信息与上下文 |
| P6 | 多媒体内容 | `bilibili_video`、`youtube_video`、`video_link`、`netease_music`、`music_link` | 丰富内容形态，延长停留时长 |
| P7 | 复制 / 二维码 | `copy_text`、`qr` | 辅助转化工具 |

### 7.1 首屏布局建议
- 身份卡 → 产品 / 服务 → 主要 CTA → 联系方式 → 案例 → 资料 → 多媒体 → 复制 / 二维码 → 品牌页脚 → 合规与举报。
- AI 接待区块在不可用时折叠为静态占位，置于联系方式上方，引导访客使用替代留资方式。

---

## 8. 缺失组件与目标组件【本次改版】

经核对当前 13 个组件文件 + 20 种模块类型与公开页目标结构，识别以下缺失或待增强项【本次改版】：

| 编号 | 组件 / 能力 | 当前状态 | 目标状态 | 改版动作 |
|------|-------------|----------|----------|----------|
| G1 | 表单留资组件 | 【未来预留】 | 【本次改版】 | 当前留资依赖 `appointment` 跳转外链，建议新增原生 `lead_form` 模块，支持姓名 / 电话 / 需求直接提交至 Workbench 线索池 |
| G2 | 文件下载组件 | 【未来预留】 | 【本次改版】 | 新增 `file_download` 模块，支持简历 / 报价单 / 白皮书下载，与 `upload-storage` 联动 |
| G3 | 倒计时 / 活动组件 | 【未来预留】 | 【本次改版】 | 新增 `countdown` 模块，用于限时活动 / 优惠截止 |
| G4 | 评价 / 证言组件 | 【未来预留】 | 【本次改版】 | 新增 `testimonial` 模块，展示客户评价，提升信任 |
| G5 | 社交账号聚合组件 | 【未来预留】 | 【本次改版】 | 新增 `social_links` 模块，聚合微博 / 抖音 / 小红书 / LinkedIn 等账号 |
| G6 | 多语言切换组件 | 【未来预留】 | 【本次改版】 | 配合 i18n 能力，新增 `lang_switch` 模块，支持中英双语主页 |
| G7 | AI 转化助手（销售） | 【部分实现】 | 【本次改版】 | 当前 `ai_chat` 仅 `customer-service` 模式，需扩展 `sales-agent` 模式并支持套餐差异 |
| G8 | 数据统计概览组件 | 【未来预留】 | 【本次改版】 | 新增 `stats_badge` 模块，展示访问量、客户数等可信数据 |
| G9 | 优惠码 / 券组件 | 【未来预留】 | 【本次改版】 | 新增 `coupon` 模块，与 `copy_text` 联动，支持领取状态追踪 |
| G10 | 直播预告组件 | 【未来预留】 | 【本次改版】 | 新增 `live_preview` 模块，接入视频号 / 抖音直播预告 |

> 注：以上【本次改版】项为 V2 改版目标，不在当前事实基线中，需由各负责 Agent 在各自文档中落地详细方案。

---

## 9. 组件编辑态、公开态、移动端、空状态、错误状态规范

### 9.1 编辑态规范
| 项 | 规范 |
|----|------|
| 编辑入口 | Workbench 控制台 → 模块管理 → 添加 / 编辑模块（`AddModuleDrawer`） |
| 字段校验 | 前端 `validators.ts` + 后端双重校验，必填项为空时禁用保存按钮 |
| 实时预览 | 编辑态右侧实时渲染 `PhonePreview` / `ProfilePreview` |
| 数据持久化 | 通过 `Link` 表 `type` + `payload`（JSON 字符串）字段存储 |
| 排序 | 支持拖拽排序，调用 `/api/dashboard/links/reorder` |
| 删除 | 二次确认，软删除，保留 30 天恢复期 |

### 9.2 公开态规范
| 项 | 规范 |
|----|------|
| 渲染入口 | `/{username}` 路由 → `SharePageRenderer` |
| 模板选择 | business / creator / conversion，由用户配置 |
| URL 安全 | 输出侧二次校验（`sanitizeHref`），不安全 URL 降级为不可点击提示 |
| 图片安全 | `SafeImage` 校验可信域名与审核状态 |
| 品牌水印 | 默认显示"由 Link168 提供"，付费套餐可隐藏 |
| 举报入口 | 默认显示"举报此主页"链接，指向 `/report` |
| vCard 下载 | 始终提供"保存到通讯录"入口 |
| 访问统计 | `/api/public/{username}/visit` 上报 PV / UV / 设备 / 来源 |

### 9.3 移动端规范
| 项 | 规范 |
|----|------|
| 最小点击区域 | 44×44pt（iOS HIG），所有可点击元素 `min-h-[44px]` 或 `min-h-[56px]` |
| 字号 | 标题 14-16px 加粗，正文 11-14px |
| 间距 | 模块间 `space-y-2`（8px），可由 `custom.moduleGap` 调整 |
| 滚动 | 消息列表 `max-h-80`（320px）自动滚到底部 |
| 输入 | maxLength=1000，回车发送，Shift+回车换行 |
| 触摸反馈 | `active:scale-[0.99]` 微缩放反馈 |

### 9.4 空状态规范
| 场景 | 规范 |
|------|------|
| 主页无任何模块 | 渲染"主页正在搭建中"占位卡片，地球图标 + 提示文案 |
| 模块 payload 为空 | 渲染 `ModuleFallback`，"模块数据为空" |
| 模块类型未知 | 渲染 `ModuleFallback`，"未知模块类型" |
| 模块校验失败 | 渲染 `ModuleFallback`，显示首个校验错误 |
| 图片加载失败 | `SafeImage` 显示占位图或默认头像（首字母） |
| 消息列表为空 | 显示欢迎语（`greeting`）作为首条 assistant 消息 |

### 9.5 错误状态规范
| 场景 | 规范 |
|------|------|
| URL 不安全 | 降级为不可点击的红色提示卡片，显示"链接被系统判定为不安全" |
| 电话格式错误 | 降级为不可点击的红色提示，"电话号码格式不正确" |
| 地图链接不安全 | 降级为不可点击的红色提示，"地图链接被系统判定为不安全" |
| AI 调用失败 | 显示"AI 接待暂时不可用，请稍后再试" |
| AI 套餐无权限 | 显示"该主页暂未开通 AI 接待，你可以直接留下联系方式" |
| 网络错误 | 显示"网络连接失败，请稍后再试" |
| 图片不可信 | 校验失败，不渲染图片，显示占位 |

---

## 10. 验收标准

### 10.1 通用验收标准（适用所有模块）
1. **类型校验**：所有模块类型必须通过 `isModuleType` 校验，未知类型统一降级到 `ModuleFallback`。
2. **payload 校验**：通过 `validateModulePayload` 校验，失败时显示首个错误信息。
3. **URL 白名单**：所有外链经 `sanitizePublicUrl` / `sanitizePhoneNumber` / `sanitizeMapUrl` 校验，禁止 `javascript:` / `data:` / `vbscript:` / `file:` 协议。
4. **图片可信域**：所有图片 URL 经 `isTrustedImageUrl` 或 `sanitizePublicUrl` 校验。
5. **新窗口安全**：所有 `target="_blank"` 链接必须带 `rel="noopener noreferrer"`。
6. **移动端可用**：所有可点击元素最小 44×44pt，触摸反馈正常。
7. **空状态优雅**：payload 为空、类型未知、校验失败均有降级 UI。
8. **统计上报**：所有用户交互事件均上报至 `/api/public/{username}/visit` 或对应统计端点。
9. **套餐校验**：付费模块在免费用户公开页不展示真实可交互形态（AI 模块不得发起真实调用）。
10. **i18n 支持**：所有展示文案支持中英双语切换。

### 10.2 AI 模块专项验收
1. **6 项前置条件**全部满足才发起真实 AI 调用。
2. **免费用户保护**：免费用户公开页不发起任何 `/api/ai/*` 真实调用。
3. **隐私提示**：默认可见或可一键展开，明确告知对话内容会被记录。
4. **举报入口**：可用，举报邮箱 `report@link168.me`，24 小时内处理。
5. **降级占位**：任一条件不满足时降级为静态占位，保留"转人工"引导。
6. **AI 内容声明**：每条 assistant 消息底部标注"— AI 生成内容"。
7. **额度耗尽**：显示"AI 接待暂时不可用"，引导转人工。
8. **服务异常**：显示"AI 接待暂时不可用，请稍后再试"。

### 10.3 模板兼容性验收
1. **business 模板**：身份卡居中，链接样式默认 `solid`。
2. **creator 模板**：大头像 + 软阴影，链接样式默认 `soft`。
3. **conversion 模板**：头像左对齐，链接样式默认 `outline`，信息密度高。
4. **三模板共用**：所有模块类型在 3 套模板下均能正常渲染，无样式错乱。
5. **自定义主题**：`customTheme` 的 backgroundType（solid / gradient / image）、cardOpacity、moduleGap 均生效。

### 10.4 性能与可访问性验收
1. **图片懒加载**：所有 `<img>` 标签 `loading="lazy"`。
2. **alt 文本**：所有图片提供 alt，空时使用占位文案。
3. **aria 标签**：所有图标按钮提供 `aria-label`。
4. **键盘可访问**：所有可交互元素支持 Tab 聚焦与 Enter 触发。
5. **首屏渲染**：LCP < 2.5s，TTI < 3.5s。
6. **bundle 体积**：SharePageRenderer 及其依赖打包后 gzip < 80KB。

---

## 附录 A：术语表

| 术语 | 释义 |
|------|------|
| 模块（Module） | 用户可在公开页配置的功能单元，对应 `Link` 表一条记录 |
| 组件（Component） | 模块的前端实现，位于 `src/components/share/modules/` |
| 渲染器（Renderer） | `SharePageRenderer`，统一渲染入口 |
| 模板（Template） | business / creator / conversion 三套布局 |
| 降级（Fallback） | 模块数据异常时的统一兜底 UI |
| 公开页 | `/{username}` 路由对应的用户对外展示页 |
| 套餐权限 | 由 `PRICING_AND_ENTITLEMENTS.md` 定义的免费 / 付费能力矩阵 |
| 6 项前置条件 | AI 模块渲染的真实调用前置约束（套餐 + 开启 + 知识 + 试聊 + 额度 + 状态） |

## 附录 B：相关文件索引

| 文件路径 | 用途 |
|----------|------|
| `src/components/share/modules/*.tsx` | 13 个模块组件实现 |
| `src/components/share/SharePageRenderer.tsx` | 公开页统一渲染器 |
| `src/features/profile-modules/registry.ts` | 模块注册表（20 种类型定义） |
| `src/features/profile-modules/types.ts` | 模块类型与分类定义 |
| `src/features/profile-modules/validators.ts` | 模块 payload 校验器 |
| `src/lib/public-url-security.ts` | URL 协议白名单与消毒 |
| `src/lib/upload-storage.ts` | 图片可信域校验 |
| `src/components/share/PublicAiAssistant.tsx` | 公开页 AI 助手封装 |
| `src/app/[username]/page.tsx` | 公开页路由入口 |
| `docs/PRICING_AND_ENTILEMENTS.md` | 套餐与定价矩阵 |
| `docs/UI_ARCHITECTURE.md` | UI 整体架构 |

---

**文档结束** | Link168 V2 文档总控团队 | Agent E | 2026-07-05
