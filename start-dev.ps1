# MathLiteratureHub 开发环境一键启动脚本
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "正在启动 MathLiteratureHub 开发环境..." -ForegroundColor Green

# 启动后端（新窗口）
Start-Process -FilePath "cmd.exe" -WorkingDirectory "$projectRoot\backend" -ArgumentList "/k",".venv\Scripts\activate.bat","&&","python","run.py"
Write-Host "后端服务启动中 -> http://127.0.0.1:8000" -ForegroundColor Cyan

# 启动前端（新窗口）
Start-Process -FilePath "cmd.exe" -WorkingDirectory "$projectRoot\frontend" -ArgumentList "/k","npm","run","dev"
Write-Host "前端服务启动中 -> http://localhost:5173" -ForegroundColor Cyan

Write-Host "`n请等待服务初始化完成后，访问 http://localhost:5173" -ForegroundColor Yellow
Write-Host "关闭弹出的两个 CMD 窗口即可停止服务" -ForegroundColor Gray