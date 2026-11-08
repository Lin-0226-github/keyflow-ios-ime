#!/usr/bin/env bash
# 一键推送到 GitHub 并触发 Actions
#
# 需要一个具备仓库写权限的 Personal Access Token（GitHub 网页 → Settings →
# Developer settings → Personal access tokens → 生成，勾选 repo / Contents 读写）。
#
# 用法：
#   GITHUB_TOKEN=ghp_xxxxxxxx  ./scripts/push.sh <owner>/<repo> [branch]
#   GITHUB_TOKEN=ghp_xxxxxxxx  ./scripts/push.sh Lin-0226-github/keyflow-ios-ime main
#
set -euo pipefail

TOKEN="${GITHUB_TOKEN:?请先设置 GITHUB_TOKEN 环境变量（PAT，需 repo 写权限）}"
REPO="${1:-Lin-0226-github/keyflow-ios-ime}"
BRANCH="${2:-main}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

git push -f "https://oauth2:${TOKEN}@github.com/${REPO}.git" "HEAD:refs/heads/${BRANCH}"

echo "✓ 已推送到 ${REPO} 的 ${BRANCH} 分支"
echo "  GitHub Actions 将自动开始：网页构建 + 未签名 IPA 编译"
echo "  查看进度：https://github.com/${REPO}/actions"
