# 恢复被删除的文件指南

如果您不小心删除了文件，可以使用以下方法恢复：

## 🔄 恢复方法

### 方法 1：从 Git 历史恢复（如果文件曾经被提交过）

```bash
# 查看文件的历史提交
git log --all --full-history -- <文件路径>

# 恢复文件（替换 <commit-hash> 为文件最后存在的提交哈希）
git checkout <commit-hash> -- <文件路径>

# 例如，恢复 .env.local.example
git checkout HEAD~1 -- .env.local.example
```

### 方法 2：从最近的提交恢复所有文件

```bash
# 查看最近的提交
git log --oneline -10

# 恢复整个目录到某个提交
git checkout <commit-hash> -- .

# 或者恢复特定文件
git checkout <commit-hash> -- <文件路径>
```

### 方法 3：使用 Git Reflog（如果文件在最近的提交中）

```bash
# 查看所有操作历史
git reflog

# 恢复到某个操作之前的状态
git reset --hard <reflog-hash>
```

### 方法 4：从暂存区恢复（如果文件被意外取消暂存）

```bash
# 查看暂存区的文件
git diff --cached

# 恢复所有暂存的文件
git restore --staged .
```

## 📝 重要文件恢复清单

如果您需要恢复以下文件，请使用上述方法：

- `.env.local` - 环境变量配置文件
- `NEW_API_PROVIDER_SETUP.md` - 新 API 提供商配置指南
- 其他 `.md` 文档文件

## ⚠️ 注意事项

1. **恢复前先备份**：在执行恢复操作前，建议先创建当前状态的备份
2. **检查文件状态**：使用 `git status` 查看当前文件状态
3. **谨慎使用 `git reset --hard`**：这会丢失未提交的更改

## 🔍 检查文件是否真的被删除

```bash
# 查看所有文件（包括未跟踪的）
git status

# 查看已删除但未提交的文件
git status | grep deleted

# 恢复所有已删除的文件
git restore .
```

## 💡 预防措施

为了避免将来再次发生类似问题：

1. **定期提交**：经常提交代码到 Git
2. **使用分支**：在功能分支上工作，而不是直接在 main 分支
3. **备份重要文件**：对于 `.env.local` 等敏感文件，建议单独备份
4. **检查脚本**：运行任何脚本前，先查看脚本内容

---

**提示**：如果文件从未被提交到 Git，则无法从 Git 历史恢复。在这种情况下，您需要手动重新创建文件。

