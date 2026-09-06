# CHINA_PRODUCTION_COMPLIANCE_GATE

**版本日期：** 2026-08-14
**状态：** CURRENT PRODUCTION-READINESS CONTRACT
**适用范围：** Link168 面向中国用户正式生产上线前的合规与真实环境门槛
**性质：** 不属于 OWNER Decision，不覆盖产品功能合同，也不构成法律意见。

## 1. 权威定位

本文件位于 OWNER Product Decision、`CURRENT_PRODUCT_AUTHORITY.md`、页面 / 交互合同和 Acceptance Contract 之后，用于阻止把 Feature Complete 误报为 Production Ready。

普通产品开发可以继续；正式中国生产上线必须同时满足本文件、真实 Provider / 数据流 / 安全环境验证，以及适用的许可、备案、登记、公示和法律文本要求。未知事实不得用 placeholder、推断或行业惯例替代。

本文件中的要求按以下性质区分：

- **LEGAL / REGULATORY GATE：** 来自现行官方规则或必须由适格人员结合真实业务作出的监管判断；
- **OWNER PRODUCT DECISION：** 继续引用 OD-001～OD-058，本文件不修改；
- **ENGINEERING REQUIREMENT：** 为执行产品合同和上线门而需要具备的记录、状态与验证能力；
- **MARKET / UX PRINCIPLE：** 保持用户操作简单，不借合规名义扩张产品。

## 2. Gate 状态

每个 Gate 只能使用：

- `PASS — VERIFIED IN REAL ENVIRONMENT`
- `FAIL`
- `PRODUCTION DATA REQUIRED`
- `LEGAL DETERMINATION REQUIRED`
- `REGULATORY CLASSIFICATION REQUIRED`
- `UNKNOWN — PRODUCTION BLOCKED FOR AFFECTED DATA FLOW`
- `NOT APPLICABLE — EVIDENCE RECORDED`

代码存在、Build 通过、Unit Mock 通过或 Feature Acceptance 通过，均不能单独使本文件变为 PASS。

## 3. CG-01 — 运营主体真实性

当前已知运营主体法定名称：

> **合肥市造梦哈勃文化传媒有限公司**

以下真实上线信息当前仍为 `PRODUCTION DATA REQUIRED`：

- 正式客服联系邮箱、电话与通信地址；
- Privacy / Terms 的版本、生效日期与发布日期；
- 最终争议条款及适用的法院 / 仲裁安排。

未知信息不得作为正式法律协议 placeholder 对外展示。

## 4. CG-02 — Personal Information Notice

所有实际收集个人信息的入口必须能够关联并保留：

```text
Policy Type
Policy Version
Purpose
Data Category
Consent / Other lawful basis
Timestamp
Source / Scene
Withdrawal state（适用时）
```

至少覆盖注册、Direct Form、Visitor AI Contact Capture、Lead、Team Invite、Billing / Order、举报、账号注销和第三方 Provider 调用。一个 `privacyAccepted = true` 总布尔值不能证明不同目的和不同政策版本均已完成有效记录。

## 5. CG-03 — Privacy / Terms Versioning

政策对象至少需要：

```text
policyType
version
effectiveAt
publishedAt
status
content/hash/reference
```

同意记录必须关联当时生效版本。处理目的、处理方式或个人信息种类发生依法需要重新取得同意的变化时，不得静默继承旧记录。具体是否需要同意、单独同意或采用其他合法处理基础，属于上线时的真实场景法律判断。

## 6. CG-04 — 数据最小化

只收集实现当前明确业务目的所必要的数据。Visitor AI、Direct Form、Lead、Team Member、Billing 和 Reports 不得以“以后可能有用、方便分析、方便 AI 或未来营销”为由默认扩大收集。

正式 Lead 继续执行 OWNER 产品规则：

```text
明确商业跟进意图
+
至少一种有效联系方式
=
正式 Lead
```

## 7. CG-05 — Data Retention Matrix

生产上线前必须建立并批准真实 Retention Matrix：

| Data Category | Processing Purpose | Active Retention | Trigger | Post-trigger Handling | Legal/Business Basis | Legal Hold |
| --- | --- | --- | --- | --- | --- | --- |

至少覆盖 Account、Personal Profile、Page Draft、Published Version、Published Business Facts、AI Conversation、Contact Draft、Lead、Internal Note、Handoff、Team Membership、Invite、AI Credit Ledger、Order、Payment、Refund、Security Log、Audit Log、Report、Complaint 和 Dispute Evidence。

统一原则：

```text
无继续处理必要
→ Delete / Irreversible Anonymization

存在明确法定保存期限或合法 Legal Hold
→ Restricted Retention

Restricted Retention
≠
继续正常业务使用
```

不得宣称全部数据可无限期保留，也不得给所有类别套用统一期限。尚未核定的具体期限标记为 `LEGAL RETENTION DETERMINATION REQUIRED`。

## 8. CG-06 — Account Cancellation

OD-058 的 30 天 Pending Cancellation 是 **Product Recovery Window**，不是统一法定保存期限。唯一 Team Owner 必须先完成 Owner Transfer 才可进入注销。

30 天到期后：

- 无继续处理依据的数据进入删除 / 不可逆匿名化；
- 法律规定保存期限未届满、技术上暂时无法删除 / 匿名化或存在合法 Legal Hold 的数据，仅可进行限制性存储及必要安全处理；
- Restricted Retention 数据不得继续用于公开主页、正常经营、营销或常规产品查询。

## 9. CG-07 — Team Dissolution

OD-057 的 30 天 Team Restore Window 同样不等于法定保存期限。Team 关闭后必须立即执行：

```text
Public Pages OFF
Member Pages OFF
Visitor AI OFF
New Leads OFF
Invites invalid
Auto-renew OFF
Team credits frozen
```

恢复窗口结束后，普通业务数据进入 deletion / anonymization pipeline；依法或争议需要保留的部分进入 Restricted Retention，不得继续作为活跃 Team 数据经营或查询。

## 10. CG-08 — Visitor AI 身份透明

Visitor AI 必须让访客明确知道当前正在与 AI 功能互动，而不是人类员工、真人客服或已在线人工顾问。AI interaction 与 Human follow-up / Handoff 必须在状态和文案上可区分，AI 不得使用虚假的真人身份。

## 11. CG-09 — AI Generated Content Marking

生产 Gate 状态：

> `AI-GENERATED CONTENT MARKING REQUIRED WHERE APPLICABLE`

产品必须根据实际内容形态和上线时适用规则，具备对应显式标识及隐式 / 元数据标识能力。Visitor AI 文本交互至少需要可见 AI 身份 / AI 生成提示位置。未来若 AI 图片、音频、视频或文件导出进入产品范围，必须重新执行该内容形态的标识验收。

不得将“一句 AI generated 文案”描述为对所有内容形态完成全部标识义务。

## 12. CG-10 — Generative AI Filing / Registration Gate

Visitor AI 上线前必须记录真实：

```text
Provider
Model name
Model service regulatory status
Filing / registration / launch number（适用时）
Operator/entity
Applicable local CAC handling status
Public disclosure requirement
Verification date
Evidence/reference
```

根据实际服务、调用方式、功能性质和属地要求完成适用的备案 / 登记 / 公示判断和手续。证据未取得前不得标记 Gate 为 PASS。适用公示要求时，只能展示真实模型名称及备案号 / 上线编号，不得使用 placeholder。

本文件不预判“Link168 已备案”“调用已备案模型即可免除全部核验”或“所有 API 应用必然单独备案”。当前状态为 `LEGAL DETERMINATION REQUIRED` 和 `PRODUCTION DATA REQUIRED`。

## 13. CG-11 — Third-Party Processor Registry

生产环境启用外部服务前必须登记：

```text
Provider Name
Service
Data Categories
Purpose
Region
Storage Location
Transfer Route
Retention
Security Terms / DPA status
Enabled Environment
Owner
Last Review
```

至少覆盖 AI、Payment、Email、SMS、Object Storage、Analytics、Captcha / Security 和 OAuth。尚未选定或尚未验证的供应商标记为 `TBD — PROVIDER NOT CONFIGURED`，不得编造厂商或处理地点。

## 14. CG-12 — Data Cross-border Gate

每条受影响数据流必须记录以下之一：

```text
NO CROSS-BORDER TRANSFER CONFIRMED

CROSS-BORDER TRANSFER EXISTS
→ LEGAL ASSESSMENT REQUIRED

UNKNOWN
→ PRODUCTION BLOCKED FOR AFFECTED DATA FLOW
```

HTTPS、服务器位于中国或供应商为中国公司，均不能单独证明没有数据出境。必须按真实数据流、接收方、处理地点、远程访问和 Provider 配置核验。

## 15. CG-13 — Internet / Telecom Regulatory Gate

正式收费上线前，根据 Link168 的实际经营模式、功能和收费服务性质，确认：

- ICP / Internet Information Service status；
- Telecom service classification；
- 是否适用额外电信业务许可；
- Domain / operator consistency；
- Hosting / access-provider compliance。

当前不得写“有 ICP 备案即可经营全部收费业务”或自行断言无需许可证。未完成分类时状态为 `REGULATORY CLASSIFICATION REQUIRED`。

## 16. CG-14 — Billing / Auto-renew Transparency

若实际启用自动续费，必须由用户主动选择，不得默认勾选；在接受服务前明确展示金额、周期和规则，提供下一扣费相关信息，并在服务期间提供显著、简便的取消 / 变更入口，不设置不合理障碍或费用。

具体提醒期限必须在生产上线前按当时现行适用规则核验，状态为 `VERIFY CURRENT APPLICABLE RULE BEFORE PRODUCTION`；不得从旧条文或地方规则机械抄写全国统一期限。

## 17. CG-15 — Security / Audit Production Gate

生产环境必须真实验证 authentication、authorization、tenant isolation、rate limiting、abuse prevention、security logging、audit logging、secret masking、backup、restore、incident handling 和 provider failure monitoring。

状态必须区分：

```text
IMPLEMENTED
VERIFIED IN TEST
VERIFIED IN REAL ENVIRONMENT
PRODUCTION READY
```

Unit Test 通过不能标记 `PRODUCTION SECURITY PASS`。

## 18. CG-16 — Legal Text Gate

正式法律页面必须使用真实 Operator legal name、Contact、Privacy / Terms version 与 effective date、第三方处理者、Retention 表述、用户权利渠道、适用争议条款和 AI 监管披露。

任何一项未知均为内部状态 `PRODUCTION DATA REQUIRED`，不能把 placeholder 作为正式协议展示给真实用户。

## 19. 当前生产阻断项

以下是 `PRODUCTION BLOCKER`，不是普通产品开发阻断：

- 正式联系方式；
- Privacy / Terms version 与 effective date；
- 实际 AI、Payment、Email、SMS、Storage 等 Provider 与 Processor Registry；
- 每条受影响数据流的跨境状态；
- AI 备案 / 登记 / 公示适用性及真实编号；
- 互联网信息服务 / 电信业务分类与 ICP / 许可事实；
- 各数据类别的最终 retention 期限或确定方法；
- 最终争议条款；
- 真实数据库、Provider、安全、备份恢复和浏览器 E2E 验证。

## 20. 官方依据与核验边界

截至 2026-08-14，本文件只使用以下官方来源确认原则性产品门槛：

- [中华人民共和国个人信息保护法（国家网信办）](https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm)
- [网络数据安全管理条例（中国政府网）](https://app.www.gov.cn/govdata/gov/202409/30/520076/article.html)
- [个人信息保护合规审计管理办法（国家网信办）](https://www.cac.gov.cn/2025-02/14/c_1741233507681519.htm)
- [人工智能生成合成内容标识办法及配套强制性国家标准发布说明（国家网信办）](https://www.cac.gov.cn/2025-03/14/c_1743654685899683.htm)
- [生成式人工智能服务管理暂行办法（国家网信办）](https://www.cac.gov.cn/2023-07/13/c_1690898327029107.htm)
- [生成式人工智能服务已备案信息公告（国家网信办）](https://www.cac.gov.cn/2024-04/02/c_1713729983803145.htm)
- [促进和规范数据跨境流动规定（国家网信办）](https://www.cac.gov.cn/2024-03/22/c_1712776611775634.htm)
- [互联网信息服务管理办法现行有效版本索引（国家行政法规库）](https://xzfg.moj.gov.cn/SearchTitleFront?QueryAll=%E4%BA%92%E8%81%94%E7%BD%91%E4%BF%A1%E6%81%AF%E6%9C%8D%E5%8A%A1%E7%AE%A1%E7%90%86%E5%8A%9E%E6%B3%95ZVING1)
- [网络交易监督管理办法（国家市场监督管理总局）](https://www.samr.gov.cn/wljys/gzzd/art/2023/art_09c394cce74f424a8d82dbc4811a11ec.html)

这些来源支持产品必须具备告知、最小必要、政策版本关联、删除 / 匿名化与受限留存、委托处理治理、AI 标识、真实备案 / 公示核验、跨境判断和自动续费透明能力。它们不能代替针对 Link168 实际业务、供应商、属地、数据量和经营模式的专业判断；无法由官方原文和真实事实直接确认的项目保持 `LEGAL DETERMINATION REQUIRED`。
