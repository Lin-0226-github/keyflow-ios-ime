"""一键把工程推送到 GitHub（走 REST Git Data API，适合 git 直连受限的环境）。

用法：
  source ~/.codebuddy/skills/github-connector/scripts/get_token.sh github
  python3 scripts/push_api.py Lin-0226-github/keyflow-ios-ime main

说明：
  - 需要 GITHUB_TOKEN 具备 contents:write 权限；只读令牌会返回 403。
  - 仓库需已存在（当前 App 令牌无法新建仓库，可先在 github.com/new 创建空仓库）。
  - 默认创建孤儿分支（不改动仓库任何已有分支 / 历史），末尾追加空提交以触发 Actions。
"""
import os, json, base64, subprocess, sys
from pathlib import Path

TOKEN = os.environ.get("GITHUB_TOKEN")
if not TOKEN:
    sys.exit("缺少 GITHUB_TOKEN；请先获取 GitHub 授权")

TARGET = sys.argv[1] if len(sys.argv) > 1 else "Lin-0226-github/keyflow-ios-ime"
BRANCH = sys.argv[2] if len(sys.argv) > 2 else "main"
OWNER, REPO = TARGET.split("/", 1)
ROOT = Path(__file__).resolve().parents[1]
BASE = f"https://api.github.com/repos/{OWNER}/{REPO}"
BODY = Path("/tmp/keyflow_api_body.json")


def api(method, path, payload=None):
    cmd = ["curl", "-s", "-w", "\n%{http_code}", "-X", method,
           "-H", f"Authorization: Bearer {TOKEN}",
           "-H", "Accept: application/vnd.github+json",
           "-H", "User-Agent: keyflow-ci"]
    if payload is not None:
        BODY.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        cmd += ["-H", "Content-Type: application/json", "--data-binary", "@" + str(BODY)]
    cmd.append(BASE + path)
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    code = int(r.stdout.rsplit("\n", 1)[-1]) if "\n" in r.stdout else 0
    raw = r.stdout.rsplit("\n", 1)[0]
    try:
        data = json.loads(raw)
    except Exception:
        data = {"raw": raw[:300]}
    return code, data


def need(ok, msg, extra=""):
    if not ok:
        print("FAIL:", msg, extra)
        sys.exit(1)


code, info = api("GET", "")
need(code == 200, "仓库不存在或无权限", f"HTTP {code} {info.get('message','')}")
print(f"目标仓库: {info['full_name']} (默认分支 {info['default_branch']})")

files = sorted(p for p in ROOT.rglob("*")
               if p.is_file() and "_site" not in p.parts and ".git" not in p.parts
               and "__pycache__" not in p.parts and p.name != ".DS_Store")
print(f"待提交 {len(files)} 个文件")

tree_items = []
for f in files:
    rel = f.relative_to(ROOT).as_posix()
    code, d = api("POST", "/git/blobs",
                  {"content": base64.b64encode(f.read_bytes()).decode("ascii"), "encoding": "base64"})
    need(code in (200, 201), f"创建 blob 失败 {rel}", f"HTTP {code} {d.get('message','')}")
    tree_items.append({"path": rel, "mode": "100644", "type": "blob", "sha": d["sha"]})
print("✓ 全部 blob 已创建")

code, d = api("POST", "/git/trees", {"tree": tree_items})
need(code in (200, 201), "创建 tree 失败", f"HTTP {code} {d.get('message','')}")
tree_sha = d["sha"]

code, d = api("POST", "/git/commits", {
    "message": "feat: KeyFlow iOS 磨砂键盘输入法（Web 原型 + XcodeGen 壳 + Actions 编译 IPA）",
    "tree": tree_sha, "parents": []
})
need(code in (200, 201), "创建 commit 失败", f"HTTP {code} {d.get('message','')}")
commit_a = d["sha"]

code, _ = api("GET", f"/git/ref/heads/{BRANCH}")
if code == 200:
    code, d = api("PATCH", f"/git/refs/heads/{BRANCH}", {"sha": commit_a, "force": True})
else:
    code, d = api("POST", "/git/refs", {"ref": f"refs/heads/{BRANCH}", "sha": commit_a})
need(code in (200, 201), "创建 / 更新分支失败", f"HTTP {code} {d.get('message','')}")
print("✓ 分支已就绪:", BRANCH)

# 空提交更新 ref，确保产生 push 事件触发 GitHub Actions
code, d = api("POST", "/git/commits", {
    "message": "chore: trigger GitHub Actions", "tree": tree_sha, "parents": [commit_a]
})
need(code in (200, 201), "创建触发提交失败", f"HTTP {code} {d.get('message','')}")
code, d = api("PATCH", f"/git/refs/heads/{BRANCH}", {"sha": d["sha"]})
need(code in (200, 201), "触发 Actions 失败", f"HTTP {code} {d.get('message','')}")
print("✓ 已触发 GitHub Actions")
print("仓库地址:", f"https://github.com/{OWNER}/{REPO}/tree/{BRANCH}")
