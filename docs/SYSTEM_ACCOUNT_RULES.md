# 系统保留账号规则

- `test@link168.me`：普通测试账号，`role=user`，`is_system=true`
- `admin@link168.me`：管理员账号，`role=admin`，`is_system=true`
- `superadmin@link168.me`：超级管理员账号，`role=superadmin`，`is_system=true`
- 系统账号禁止通过后台、API、清理脚本删除
- 数据库层通过 trigger 防止误删
