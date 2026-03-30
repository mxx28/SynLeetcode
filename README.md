<div align="center">

<img src="extension/icons/icon128.png" width="88" height="88" alt="SynLeetcode" />

# SynLeetcode

**When your run is Accepted on LeetCode, your code syncs to GitHub.**

[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)

</div>

---

### What it does

- Works on **leetcode.com**, **leetcode.cn**, and **`*.lingkou.xyz`** problem pages.  
- After **Accepted**, it writes `{folder}/{id}-{slug}.{ext}` (e.g. `leetcode/1-two-sum.cpp`). Re-AC overwrites the same file.  
- The popup can **check** your repo/branch before the first sync. Allow **notifications** if you want success/failure toasts.

### Install

1. Chrome → **Extensions** → turn on **Developer mode**.  
2. **Load unpacked** → choose the **`extension`** folder (inside this repo).  
3. Allow **notifications** when asked.

### Set up (short)

1. **Create the repo on GitHub yourself** — this extension does **not** create it.  
2. Create a **GitHub PAT**: Classic → **`repo`** (or **`public_repo`** for public only); fine-grained → **Contents: Read and write** on that repo.  
3. Extension icon → **Open settings** → token, owner, repo, branch (often `main`) → **Save**.  
4. Solve on the problem page; submit until **Accepted**. **Save** only stores settings — the push runs after Accepted.

**Privacy:** Token stays in `chrome.storage.local` on your device; only **GitHub’s API** is used. LeetCode may change their site; if sync breaks, check the popup message and your login, repo, branch, and token.
