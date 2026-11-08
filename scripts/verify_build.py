"""校验构建产物：单文件、零外部依赖、关键功能标记齐全。"""
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
html = (root / "index.html").read_text(encoding="utf-8")
site = root / "_site/index.html"

required_ids = [
    "editor", "viewKeys", "candidateBar", "pinyinBox", "candScroll",
    "panelClipboard", "panelHandwrite", "hwCanvas", "btnLogo", "kbToolbar",
    "tbTranslate", "tbHandwrite", "tbClipboard", "tbWordbook", "tbSettings", "tbCollapse",
    "funcMenu", "sheet", "heightRange", "wbArea", "translateBar", "grip",
]
required_text = [
    "剪贴板", "收起键盘", "边写边译", "手写找字", "输入震动", "词库", "键盘高度",
    "--key-bg", "backdrop-filter", "KF_DATA",
]
forbidden = ["__STYLE__", "__SCRIPT__", '<script src=', '<link rel="stylesheet" href=', "example.com"]

checks = []
def check(name, cond, detail=""):
    checks.append((bool(cond), name, detail))

check("产物存在且非空", len(html) > 50000, f"{len(html)} 字符")
check("无未替换占位符 / 外部资源", not any(x in html for x in forbidden))
check("样式已内联", "<style>" in html and "--key-bg" in html)
check("脚本已内联", html.count("<script>") >= 2 and "window.KF_DATA" in html)
for i in required_ids:
    check(f"DOM #{i}", f'id="{i}"' in html)
for t in required_text:
    check(f"内容 {t}", t in html)
check("Pages 产物一致", site.exists() and site.read_text(encoding="utf-8") == html)
ios_web = root / "ios/Web/index.html"
check("iOS 壳内置页面一致", ios_web.exists() and ios_web.read_text(encoding="utf-8") == html)

ios_files = [
    "ios/project.yml", "ios/App/AppDelegate.swift", "ios/App/WebViewController.swift",
    "ios/Supporting/Info.plist", ".github/workflows/build-ipa.yml",
    ".github/workflows/build-signed.yml",
]
for f in ios_files:
    check(f"iOS 工程 {f}", (root / f).exists())
ipa_yml = (root / ".github/workflows/build-ipa.yml").read_text(encoding="utf-8")
check("IPA 工作流使用 macOS + xcodebuild", "macos-14" in ipa_yml and "xcodebuild" in ipa_yml and "KeyFlow-unsigned.ipa" in ipa_yml)
check("工程名 KeyFlow", "name: KeyFlow" in (root / "ios/project.yml").read_text(encoding="utf-8"))
check("真机沉浸模式注入", "KeyFlowNative" in (root / "ios/App/WebViewController.swift").read_text(encoding="utf-8")
      and "body.native" in html)

for ok, name, detail in checks:
    print(f"{'PASS' if ok else 'FAIL'} | {name} | {detail}")
failed = [c for c in checks if not c[0]]
print(f"\n通过 {len(checks) - len(failed)}/{len(checks)}")
sys.exit(1 if failed else 0)
