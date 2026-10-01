# 多语言（i18n）设计方案

> 状态：已与需求方对齐（2026 追问评审通过）
> 关联分支：`feat/i18n`（基于 `v2` 拉出）

## 1. 目标

Sparkle 支持中英文界面切换：

- 设置页（Settings → Appearance）提供语言切换下拉控件；
- 首次启动跟随 Windows 系统区域；手动选择后跨会话持久化；
- 应用内全部静态 UI 文案（8 个页面 + 共享组件 + toast 提示）支持中英双语；
- 托盘菜单（main 进程）跟随当前语言；
- 翻译与功能代码**严格分离**，保证未来从上游 `v2` 合并时冲突面最小。

## 2. 决策记录

| # | 决策点 | 结论 | 关键理由 |
|---|--------|------|----------|
| 1 | 翻译范围 | 全 UI 静态文案；changelog markdown、tweaks 详情 markdown、apps.json 应用描述、PowerShell 输出**保持英文** | 外部/动态内容翻译维护成本极高、收益不成比例 |
| 2 | 技术方案 | `i18next` + `react-i18next`，配置 `keySeparator: false` | 成熟生态；缺失 key 自动回退；命名空间支持按页拆分（预留） |
| 3 | Key 策略 | **英文原文即 key**（如 `t("Check for Updates")`）；不建 `en.json`，key 缺失即回退英文 | 上游改英文文案后合并零维护成本，永远不会出现空白/乱码 |
| 4 | 默认语言 | Auto：读系统区域（`zh` 前缀 → `zh-CN`，其余 → `en`）；手动选择后持久化，优先于系统 | 中文用户零配置可用；手动选择跨会话保留 |
| 5 | 持久化 | renderer `localStorage`，key 为 `sparkle:language`（与 `theme` 等现有设置同模式）；值为 `"auto"` / `"en"` / `"zh-CN"` | 不引入 electron-store 跨进程复杂度 |
| 6 | 托盘菜单 | renderer 启动解析出实际语言后，经 IPC `locale:set` 推给 main；main 按语言重建 `Menu.buildFromTemplate` | 成本约 20 行；main 只持有内存值，重启后由 renderer 重新推送 |
| 7 | 语言控件 | Appearance 区块新增 Dropdown，选项 `Auto / English / 中文`；Auto 存 `"auto"` 字面值，每次启动重新解析系统区域 | 系统语言变更后可再次被跟随，这是 Auto 存在的意义 |
| 8 | 翻译完整度 | 一步到位：全部静态字符串（含 toast、placeholder、tooltip、section 标题）译完 | 回退机制是防上游改动的保险，不该成为日常体验 |
| 9 | 分支 | 基于 `v2` 新建 `feat/i18n` | 与主线隔离，方便评审与回退 |
| 10 | 验证 | `typecheck` + `lint` + 现有 `vitest` 套件（main 进程）+ `pnpm dev` 手动验证；**不**新建 renderer 测试基建 | 自研逻辑仅约 10 行（语言解析 + 持久化），测试收益薄 |

### 边界约定（评审中确认，不再展开）

1. 安装器（electron-builder `electronLanguages: ["en-US"]`）**保持英文**，多语言只作用于应用内 UI；
2. 品牌名 "Sparkle" / "Sparkle Optimizer" 及托盘 tooltip **不翻译**，仅翻译托盘菜单项（Open Window / Quit）；
3. 繁体中文系统（zh-TW 等）在 Auto 模式下命中 `zh` 前缀归入简体中文，个别词回退英文，可接受，不单独处理。

## 3. 架构

### 3.1 文件布局（新增）

```
src/renderer/src/
  i18n/
  ├── index.ts        # createInstance + 资源加载 + 语言解析（resolveLanguage）
  └── locales/
      └── zh-CN.json  # 唯一的翻译文件（key = 英文原文）
src/preload/index.ts  # 暴露 locale 相关 IPC（如需要）
src/main/index.ts     # 订阅 locale:set，触发托盘重建
src/main/tray.ts      # 菜单模板按语言取词；createTray 增加 rebuild 能力
```

### 3.2 关键流程

**启动解析（renderer）**：

1. 读 `localStorage["sparkle:language"]`；无值视为 `"auto"`。
2. `auto` → 取 `navigator.language`，`zh` 前缀 → `zh-CN`，否则 `en`。
3. `i18n.changeLanguage(resolved)`，资源仅加载 `zh-CN`（en 不建资源，回退链 `fallbackLng: false`，key 本身即英文文案）。
4. `invoke({ channel: "locale:set", payload: resolved })` 通知 main 重建托盘菜单。

**切换（Settings → Appearance）**：

- Dropdown 选 `Auto / English / 中文` → 写 `localStorage["sparkle:language"]`（Auto 存 `"auto"`）→ 按 3.2 流程 2–4 重走解析并 `changeLanguage`。
- 立即生效，无需重启（托盘菜单经 IPC 同步重建）。

### 3.3 功能文件改动规则（合并冲突的最小化保证）

- 功能文件（pages / components）里**只做一件事**：把字符串字面量机械地包上 `t(...)`（静态 JSX 用 `t("...")`，模板串用插值 `t("Update available: {{v}}", { v: ... })`，key 为占位前的英文原文）。
- 不引入条件语言逻辑、不复制文案、不 import 语言相关常量——功能代码对"中文"零感知。
- 上游合并后：上游改了英文文案 → key 变了 → 该词回退英文，自动保持可用；随后把新英文词补进 `zh-CN.json` 即可，无需改功能代码。
- 冲突高发区（Settings.tsx、各页面 JSX）以"一行一 key"的机械替换为原则，diff 保持线性。

### 3.4 动态内容豁免清单

| 内容 | 来源 | 处理 |
|------|------|------|
| changelog 内容 | `changelogModal` 内 markdown | 保持英文 |
| Tweaks 详情 / 描述 | `tweaks/<name>/meta.json` + markdown | 保持英文 |
| Apps 描述 | `apps.json`（默认从 GitHub 拉取） | 保持英文 |
| PowerShell / 命令输出 | 控制台类组件 | 保持英文 |
| 兼容性提示（如 "Requires a dedicated GPU"） | 属 UI 静态文案 | **翻译**（属 #8 全量范围） |

## 4. 实施步骤（建议顺序）

1. 从 `v2` 拉出 `feat/i18n` 分支。
2. 安装 `i18next` + `react-i18next`（pnpm）。
3. 搭 `src/renderer/src/i18n/`：初始化、语言解析、`zh-CN.json` 骨架。
4. 主进程：`locale:set` 订阅 + 托盘菜单模板双语化 + preload 无需改动（复用 `invoke`）。
5. Settings 页：新增 Language Dropdown + 持久化逻辑。
6. 逐页替换 UI 字符串为 `t(...)`，同步填充 `zh-CN.json`（Home → Nav/Titlebar → Apps → Clean → Tweaks → Debloat → DNS → Backup → Utilities → Settings → 共享组件/toast）。
7. 验证：`pnpm typecheck && pnpm lint && pnpm test`，再 `pnpm dev` 手动过一遍两种语言的各页面与托盘。
8. 提 PR（或合并回 `v2`，按仓库流程）。

## 5. 验收标准

- [ ] 中文系统首次启动 → 全界面（含托盘）为中文；英文系统 → 英文。
- [ ] Settings 内切换三种选项均即时生效并跨重启保留。
- [ ] 删除 `localStorage["sparkle:language"]` 后重启 → 跟随系统区域。
- [ ] `zh-CN.json` 中删掉任意一个 key → 该处显示英文原文，应用不报错、不空白。
- [ ] `typecheck` / `lint` / `test` 全绿。
- [ ] 模拟上游场景：改动一处英文 key 后应用仍正常（回退英文）。
