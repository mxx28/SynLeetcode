<div align="center">

<img src="extension/icons/icon128.png" width="88" height="88" alt="SyncLeetcode" />

# SyncLeetcode

**When your run is Accepted on LeetCode, your code syncs to GitHub.**

[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)

</div>

## Introduction

SyncLeetcode is a **Chrome extension** that syncs your **Accepted** LeetCode submissions to a GitHub repository you configure—so you can track progress and publish solutions on GitHub.

The idea comes from **[LeetSync](https://github.com/3ba2ii/LeetSync)** and similar tools. Many of those no longer work after LeetCode changed their pages and APIs, and several do not support leetcode.cn. SyncLeetcode targets the current sites and works on **leetcode.com** and **leetcode.cn** .


## What it does

- Works on **leetcode.com** and **leetcode.cn** problem pages.  
- After **Accepted**, it writes `{folder}/{id}-{slug}.{ext}`; another AC on the same problem overwrites that file.  
- The popup can **check** your repo/branch before the first sync.

## Install

1. Chrome → **Extensions** → turn on **Developer mode**.  
2. **Load unpacked** → choose the **`extension`** folder (inside this repo).  
3. Allow **notifications** when asked.

## Set up

1. **Create the repo on GitHub yourself** — this extension does **not** create it.  
2. Create a **GitHub PAT**: Classic → **`repo`** (or **`public_repo`** for public only); fine-grained → **Contents: Read and write** on that repo.  
3. Extension icon → **Open settings** → token, owner, repo, branch → **Save**.  
4. Solve on the problem page; submit until **Accepted**. **Save** only stores settings — the push runs after Accepted.

---

**Privacy:** Token stays in `chrome.storage.local` on your device; only **GitHub’s API** is used. LeetCode may change their site; if sync breaks, check the popup message and your login, repo, branch, and token.
