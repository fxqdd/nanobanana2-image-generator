# Cloudflare Pages 部署脚本
# 使用方法: .\deploy.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Cloudflare Pages 部署助手" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否在 Git 仓库中
if (-not (Test-Path .git)) {
    Write-Host "[错误] 当前目录不是 Git 仓库" -ForegroundColor Red
    exit 1
}

# 显示当前状态
Write-Host "📋 当前 Git 状态:" -ForegroundColor Yellow
git status --short
Write-Host ""

# 询问是否添加所有文件
$addAll = Read-Host "是否添加所有修改的文件? (y/n, 默认: y)"
if ($addAll -eq "" -or $addAll -eq "y" -or $addAll -eq "Y") {
    Write-Host "📦 添加文件到暂存区..." -ForegroundColor Yellow
    git add -A
    
    # 排除不需要的文件
    git reset HEAD dist/ 2>$null
    git reset HEAD node_modules/ 2>$null
    git reset HEAD .env 2>$null
    git reset HEAD ".env.*" 2>$null
    
    Write-Host "✓ 文件已添加" -ForegroundColor Green
} else {
    Write-Host "⚠️  请手动运行 git add 添加文件" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 已暂存的文件:" -ForegroundColor Yellow
git diff --cached --name-status
Write-Host ""

# 检查是否有文件被暂存
$staged = git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "[警告] 没有文件被暂存，请先运行 git add" -ForegroundColor Yellow
    exit 0
}

# 输入提交信息
$defaultMsg = "fix: 修复登录系统和UI翻译问题"
Write-Host "💬 提交信息 (默认: $defaultMsg):" -ForegroundColor Yellow
$commitMsg = Read-Host
if ($commitMsg -eq "") {
    $commitMsg = $defaultMsg
}

Write-Host ""
Write-Host "提交信息: $commitMsg" -ForegroundColor Cyan
$confirm = Read-Host "确认提交并推送到远程仓库? (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "[取消] 操作已取消" -ForegroundColor Yellow
    exit 0
}

# 提交
Write-Host ""
Write-Host "📤 提交更改..." -ForegroundColor Yellow
git commit -m $commitMsg
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] Git 提交失败" -ForegroundColor Red
    exit 1
}

# 推送到远程
Write-Host ""
Write-Host "🚀 推送到远程仓库..." -ForegroundColor Yellow
git push
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] Git 推送失败" -ForegroundColor Red
    exit 1
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✓ 部署成功!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📌 Cloudflare Pages 会自动检测推送并开始部署" -ForegroundColor Cyan
    Write-Host "   请前往 Cloudflare Dashboard 查看部署状态" -ForegroundColor Cyan
    Write-Host ""
}

