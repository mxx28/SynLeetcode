<div align="center">

<img src="extension/icons/icon128.png" width="88" height="88" alt="SyncLeetcode" />

# SyncLeetcode

[English](README.md) | [简体中文](README.zh-CN.md)

**When your run is Accepted on LeetCode, your code syncs to GitHub.**

[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![GitHub](https://img.shields.io/badge/GitHub-SynLeetcode-181717?logo=github&logoColor=white)](https://github.com/mxx28/SynLeetcode)
[![LeetCode](https://img.shields.io/badge/LeetCode-.com%20%26%20.cn-FFA116?logo=leetcode&logoColor=black)](https://leetcode.com)

</div>

## Introduction

SyncLeetcode is a **Chrome extension** that syncs your **Accepted** LeetCode submissions to a GitHub repository you configure—so you can track progress and publish solutions on GitHub.

The idea comes from **[LeetSync](https://github.com/3ba2ii/LeetSync)** and similar tools. Many of those no longer work after LeetCode changed their pages and APIs, and several do not support leetcode.cn. SyncLeetcode targets the current sites and works on **leetcode.com** and **leetcode.cn** .

<p align="center">
  <img src="docs/intro-overview.png" width="780" alt="Extension popup over a GitHub repo: last sync, stats, and auto-generated README with badges and activity chart" />
</p>

## Features

- **Accepted → pushed** — Each **Accepted** run writes one solution file; AC the same problem again and it overwrites in place.  
- **leetcode.com & leetcode.cn** — Works on current problem pages for both sites.  
- **Living repo README (optional)** — Auto-refreshed badges, headline, and activity chart so your progress is visible on GitHub.  
- **Desktop notifications (optional)** — Success or failure pings for every push—you’re not left guessing whether GitHub got the file.  

## Install

1. Open **Chrome** or another **Chromium-based** browser (e.g. Edge, Brave) → **Extensions** → turn on **Developer mode**.  
2. **Load unpacked** → choose the **`extension`** folder (inside this repo).  
3. Allow **notifications** when asked.

## Set up

1. **Repo** — Create it on GitHub yourself (empty or private is fine).  
2. **PAT** — [New classic token](https://github.com/settings/tokens/new) or [new fine-grained token](https://github.com/settings/personal-access-tokens/new); required scopes are explained in **extension settings**.  
3. **Configure** — Extension icon → **Open settings** → token, owner, repo, branch → **Save**.  
4. **Sync** — Submit until **Accepted** on a problem page; that’s when GitHub is updated (**Save** only stores settings).  
5. **Notifications (optional)** — If you want alerts when a push succeeds or fails, turn them on under **Behavior** in settings—and remember to allow notifications for your **browser** in **system** settings (macOS, Windows, …).

## Contributing

PRs and ideas are welcome. **Feel free to [open an issue](https://github.com/mxx28/SynLeetcode/issues)** if something breaks, you want a feature, or you’re not sure where to start—we’ll figure it out together.

---

**Privacy:** Your token stays in `chrome.storage.local` on your device; only **GitHub’s API** is used. LeetCode may change their site; if sync breaks, check the popup message and your login, repo, branch, and token.
