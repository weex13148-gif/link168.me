# Link168 资料单一来源位置

为避免重复文件和Agent误读，以下内容只允许一个正式位置：

| 内容 | 唯一位置 | 规则 |
|---|---|---|
| 产品与工程规则 | `00_GOVERNANCE_LOCKED/`、根目录`PRD.md`和`PROJECT_RULES.md` | 不建立同义副本 |
| API实现代码 | `src/app/api/` | 接口资料不得包含密钥 |
| API合同与接入说明 | `01_PRODUCT/API_INTERFACES/` | 只写合同、字段、状态和错误规则 |
| 正式Logo文件 | `public/brand/` | 不在其他目录复制Logo |
| 正式产品文本 | `01_PRODUCT/TEXT_CONTENT/` | 页面采用前先经过老板确认 |

`.env`、私钥、数据库连接串、支付密钥、邮件密钥和AI密钥不得放入以上目录，也不得提交Git。
