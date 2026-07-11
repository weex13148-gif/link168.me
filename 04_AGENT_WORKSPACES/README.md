# Agent 隔离工作区说明

此目录用于保存隔离工作区规则和索引，不在 GitHub 中复制十份完整源代码。

实际执行时：

- 每个写代码的 Agent 使用独立 Git 分支或 Git worktree。
- 不允许十个 Agent 同时修改同一个工作目录。
- 每个工作区只承载一个任务卡。
- 集成由总控 Agent 按 `02_EXECUTION_CONTROL/INTEGRATION_ORDER.md` 完成。
- 临时构建产物、依赖目录、密钥和环境文件不得提交。
