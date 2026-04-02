<div align="center">

<img src="extension/icons/icon128.png" width="88" height="88" alt="SyncLeetcode" />

# SyncLeetcode

[English](README.md) | [简体中文](README.zh-CN.md)

**当你在 LeetCode 上运行通过 Accepted 后，代码会自动同步到 GitHub。**

[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![GitHub](https://img.shields.io/badge/GitHub-SynLeetcode-181717?logo=github&logoColor=white)](https://github.com/mxx28/SynLeetcode)
[![LeetCode](https://img.shields.io/badge/LeetCode-.com%20%26%20.cn-FFA116?logo=leetcode&logoColor=black)](https://leetcode.com)

</div>

## 简介

SyncLeetcode 是一个 **Chrome 扩展**，会把你在 LeetCode 上 **Accepted** 的提交同步到你配置好的 GitHub 仓库中，方便你持续记录刷题进度并展示解法。

这个项目的灵感来自 **[LeetSync](https://github.com/3ba2ii/LeetSync)** 及类似工具。LeetCode 调整页面和接口后，很多同类项目已经失效，而且不少也不支持 `leetcode.cn`。SyncLeetcode 面向当前站点实现，支持 **leetcode.com** 和 **leetcode.cn**。

<p align="center">
  <img src="docs/intro-overview.png" width="780" alt="Extension popup over a GitHub repo: last sync, stats, and auto-generated README with badges and activity chart" />
</p>

## 功能

- **Accepted 自动推送**：每次题目运行结果为 **Accepted** 时，都会写入一个解答文件；同一题再次 AC 会原地覆盖。
- **同时支持 leetcode.com 和 leetcode.cn**：兼容当前两个站点的题目页面。
- **动态更新仓库 README（可选）**：自动刷新徽章、标题和活动图表，让你的刷题进度直接展示在 GitHub 上。
- **桌面通知（可选）**：每次推送成功或失败都会通知你，不需要猜 GitHub 有没有收到。

## 安装

1. 打开 **Chrome** 或其他 **Chromium 内核** 浏览器（如 Edge、Brave），进入 **Extensions**，开启 **Developer mode**。
2. 点击 **Load unpacked**，选择本仓库里的 **`extension`** 文件夹。
3. 如果浏览器询问通知权限，请选择允许。

## 配置

1. **仓库**：先在 GitHub 上自己创建一个仓库，空仓库或私有仓库都可以。
2. **PAT**：[classic token](https://github.com/settings/tokens/new) 或 [fine-grained token](https://github.com/settings/personal-access-tokens/new) 都可以；所需权限会在扩展设置页里说明。
3. **填写配置**：点击扩展图标，进入 **Open settings**，填写 token、owner、repo、branch，然后点击 **Save**。
4. **开始同步**：在题目页提交并拿到 **Accepted** 后，才会真正同步到 GitHub；单纯点 **Save** 只是在保存设置。
5. **通知（可选）**：如果想在推送成功或失败时收到提醒，可以在设置页的 **Behavior** 中开启；同时也记得在你的 **系统** 设置里允许浏览器发送通知（macOS、Windows 等）。

## 贡献

欢迎提交 PR 或提出想法。如果你发现功能失效、想要新特性，或者不确定从哪里开始，直接 **[提 issue](https://github.com/mxx28/SynLeetcode/issues)** 就行，我们可以继续往下完善。

---

**隐私说明：** 你的 token 只会保存在本机的 `chrome.storage.local` 中；程序只会调用 **GitHub API**。LeetCode 后续如果再次改版，可能会导致同步失效；这时请先检查弹窗提示，以及登录状态、仓库、分支和 token 配置。
