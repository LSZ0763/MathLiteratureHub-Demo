# MathLiteratureHub

<p align="center">
  <b>数学动力系统文献智能搜索与总结系统</b>
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> •
  <a href="#项目结构">项目结构</a> •
  <a href="#api-文档">API 文档</a> •
  <a href="#贡献指南">贡献指南</a>
</p>

---

## 📖 项目简介

**MathLiteratureHub** 是一款面向数学研究者（特别是动力系统方向）的文献搜索与管理工具。它能够从多个学术数据源（arXiv、zbMATH、MathSciNet）自动检索最新文献，提供搜索结果展示、简报预览与生成，并支持自动执行任务，帮助用户高效追踪研究方向最新进展。

无论你是想追踪某个细分方向的最新进展，还是需要为组会/报告快速整理文献综述，这个工具都能帮你省下大量时间。

### 核心功能

| 功能 | 说明 |
|------|------|
| 🔍 **文献搜索** | 同时检索 arXiv、zbMATH、MathSciNet，支持关键词、作者、时间范围筛选 |
| 📋 **搜索结果展示** | 多维度展示搜索结果，支持排序、筛选与详情查看 |
| 📄 **简报预览与生成** | 预览并一键导出格式规范的 `.docx` 文献综述文件 |
| ⚙️ **自动执行任务** | 支持定时自动搜索、简报自动生成与邮件通知等自动化流程 |
| 📚 **历史管理** | 自动保存搜索记录与简报，支持下载和删除 |

---

## 🚀 快速开始

### 环境要求

- **Python** 3.11+
- **Node.js** 18+
- **Git**

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd MathLiteratureHub
```

### 2. 配置后端

```bash
cd backend

# 创建虚拟环境
python -m venv .venv

# Windows
.venv\Scripts\pip install -r requirements.txt

# macOS / Linux
# source .venv/bin/pip install -r requirements.txt

# 复制环境变量模板
copy .env.example .env        # Windows
cp .env.example .env          # macOS / Linux
```

编辑 `.env` 文件，按需调整配置（项目开箱即用，无需配置 LLM API）：

```env
# 数据库（默认 SQLite，无需额外配置）
DATABASE_URL=sqlite:///./data/math_literature.db

# arXiv 搜索上限
ARXIV_MAX_RESULTS=50

# 邮件通知（可选，留空即可）
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
FROM_EMAIL=
```

> ⚠️ **重要**：`.env` 文件已加入 `.gitignore`，**请勿将其提交到 Git 仓库**，以免泄露敏感信息。

启动后端服务：

```bash
# Windows
.venv\Scripts\python run.py

# macOS / Linux
# source .venv/bin/python run.py
```

后端默认运行在 **`http://127.0.0.1:8000`**。

### 3. 配置前端

新开一个终端窗口：

```bash
cd frontend
npm install
npm run dev
```

前端默认运行在 **`http://localhost:5173`**，并自动代理 API 请求到后端。

### 4. 一键启动（Windows PowerShell）

如果你使用 Windows，也可以直接运行根目录下的一键启动脚本：

```powershell
.\start-dev.ps1
```

该脚本会同时弹出后端和前端的 CMD 窗口。

### 5. 打开浏览器

访问 **`http://localhost:5173`** 即可开始使用。

---

## 📁 项目结构

```
MathLiteratureHub/
│
├── 📂 backend/                 # FastAPI 后端
│   ├── app/
│   │   ├── main.py             # FastAPI 应用入口
│   │   ├── config.py           # 配置管理（pydantic-settings + python-dotenv）
│   │   ├── database.py         # 数据库连接、会话管理与迁移
│   │   ├── models.py           # SQLAlchemy ORM 模型
│   │   ├── schemas.py          # Pydantic 数据校验模型
│   │   │
│   │   ├── 📂 routers/         # API 路由模块
│   │   │   ├── search.py       # 文献搜索接口
│   │   │   ├── briefings.py    # 简报生成/下载/管理
│   │   │   ├── history.py      # 历史记录查询
│   │   │   ├── settings.py     # 系统设置与关键词管理
│   │   │   └── filter.py       # 文献筛选与排序
│   │   │
│   │   └── 📂 services/        # 业务逻辑层
│   │       ├── unified_search.py    # 统一搜索调度
│   │       ├── arxiv_search.py      # arXiv 数据源
│   │       ├── zbmath_search.py     # zbMATH 数据源
│   │       ├── mathscinet_search.py # MathSciNet 数据源
│   │       ├── citation_enricher.py # 引用信息补全
│   │       ├── docx_generator.py    # Word 文档生成
│   │       └── subject_config.py    # 学科/子领域配置
│   │
│   ├── requirements.txt        # Python 依赖
│   ├── run.py                  # 开发服务器启动脚本
│   ├── .env.example            # 环境变量模板（可安全提交）
│   └── .env                    # 本地环境变量（已加入 .gitignore）
│
├── 📂 frontend/                # React + Vite 前端
│   ├── src/
│   │   ├── App.jsx             # 根组件
│   │   ├── main.jsx            # 应用入口
│   │   ├── 📂 pages/           # 页面级组件
│   │   ├── 📂 components/      # 可复用组件
│   │   │   ├── SearchModal.jsx
│   │   │   ├── SearchResultsView.jsx
│   │   │   ├── BriefingWizard.jsx
│   │   │   ├── PaperDetailPanel.jsx
│   │   │   ├── FilterPanel.jsx
│   │   │   └── CitationGraph.jsx
│   │   └── 📂 services/        # API 封装层
│   ├── package.json            # Node 依赖
│   └── vite.config.js          # Vite 配置
│
├── 📂 data/                    # 本地数据存储（SQLite / 生成的简报）
│   └── briefings/
│
├── .gitignore                  # Git 忽略规则（已包含 .env、日志、构建产物等）
├── start-dev.ps1              # Windows 一键启动脚本
└── README.md                   # 本文件
```

---

## 📡 API 文档

本项目基于 **FastAPI** 构建，自带交互式 API 文档。启动后端后访问：

- **Swagger UI**：`http://127.0.0.1:8000/docs`
- **ReDoc**：`http://127.0.0.1:8000/redoc`

### 主要接口一览

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/search/` | 执行文献搜索 |
| `GET`  | `/api/search/subjects` | 获取支持的学科与子领域列表 |
| `POST` | `/api/briefings/` | 生成 Word 简报 |
| `GET`  | `/api/briefings/` | 列出所有简报 |
| `GET`  | `/api/briefings/{id}/download` | 下载指定简报 |
| `DELETE` | `/api/briefings/{id}` | 删除指定简报 |
| `POST` | `/api/filter/` | 对已获取的文献进行筛选和排序 |
| `GET`  | `/api/history/papers` | 查看历史搜索到的文献 |
| `GET`  | `/api/settings/` | 读取系统设置 |
| `PUT`  | `/api/settings/` | 更新系统设置 |
| `GET`  | `/api/settings/keywords` | 获取关键词过滤列表 |
| `POST` | `/api/settings/keywords` | 添加关键词 |
| `DELETE` | `/api/settings/keywords/{id}` | 删除关键词 |
| `GET`  | `/api/health` | 健康检查 |

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！在贡献之前，请阅读以下指引：

### 如何贡献

1. **Fork 本仓库**，并在你的分支上进行开发。
2. **创建功能分支**：`git checkout -b feature/your-feature-name`
3. **提交更改**：遵循清晰的 commit 信息规范
   - `feat:` 新功能
   - `fix:` 修复 bug
   - `docs:` 文档更新
   - `refactor:` 代码重构
   - `chore:` 构建/工具改动
4. **确保代码风格一致**：
   - Python 代码遵循 PEP 8
   - React 代码遵循项目已有的 ESLint 规则
5. **提交 Pull Request**：描述清楚改动内容和动机

### 开发建议

- 新增数据源请在 `app/services/` 下新建模块，并在 `unified_search.py` 中注册。
- 修改数据库模型后，请确保 `database.py` 中的 `migrate()` 函数能正确处理旧表结构升级。
- 涉及敏感配置（API Key、密码等）一律通过 `.env` 读取，**不要硬编码**。

### 报告问题

如果遇到 Bug 或有功能建议，请通过 GitHub Issues 反馈，并尽量提供：
- 问题的简要描述
- 复现步骤
- 期望行为 vs 实际行为
- 相关日志或截图

---

## 📜 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

---

<p align="center">
  Made with ❤️ for Math Researchers
</p>
