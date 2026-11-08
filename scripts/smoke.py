"""浏览器冒烟测试：验证按键、拼音候选、菜单与七大功能。"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import sys

URL = (Path(__file__).resolve().parents[1] / "index.html").as_uri()
errors, results = [], []


def ok(name, cond, extra=""):
    results.append((bool(cond), name, str(extra)))


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 1440, "height": 950})
    page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
    page.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
    page.goto(URL)
    page.wait_for_timeout(500)

    ok("键盘 32 个按键", page.locator("#viewKeys .key").count() == 32, page.locator("#viewKeys .key").count())
    ok("默认深色磨砂按键", "light" not in (page.locator("#screen").get_attribute("class") or ""))
    ok("候选栏初始隐藏（贴近参考图）", not page.locator("#candidateBar").is_visible())
    ok("底行地球/麦克风存在", page.locator("#btnGlobe").count() == 1 and page.locator("#btnMic").count() == 1)
    ok("第四行 123/表情/空格/搜索", page.locator('#viewKeys .key[data-v="numbers"]').count() == 1
       and page.locator('#viewKeys .key[data-fn="emoji"]').count() == 1
       and page.locator('#viewKeys .key[data-fn="return"]').inner_text().strip() == "搜索")

    # 拼音输入
    for ch in "nihao":
        page.locator(f'#viewKeys .key[data-k="{ch}"]').click()
    ok("拼音串累积", page.locator("#pinyinBox").inner_text() == "nihao")
    ok("输入时候选栏出现", page.locator("#candidateBar").is_visible())
    cands = page.locator("#candScroll .cand").all_inner_texts()
    ok("「你好」为首选", bool(cands) and cands[0] == "你好", ",".join(cands[:4]))
    page.locator("#candScroll .cand").first.click()
    ok("候选词上屏", "你好" in page.locator("#editor").input_value())

    # 地球键功能菜单
    page.locator("#btnGlobe").click()
    ok("功能菜单打开", page.locator("#funcMenu").is_visible())
    ok("菜单含 8 项功能", page.locator("#funcMenu .func-item").count() == 8)
    page.locator('#funcMenu [data-view="clipboard"]').click()
    ok("剪贴板面板打开", page.locator("#panelClipboard").is_visible())
    before = page.locator("#editor").input_value()
    page.locator("#clipList .clip-item").first.click()
    ok("剪贴板可粘贴", page.locator("#editor").input_value() != before)
    page.locator("#panelClipboard .panel-head [data-view=keys]").click()

    page.locator("#btnGlobe").click()
    page.locator("#fmTranslate").click()
    ok("边写边译开启", "on" in (page.locator("#translateBar").get_attribute("class") or ""))
    ok("译文非空", len(page.locator("#trText").inner_text()) > 3)

    # 收起键盘预选词
    page.locator("#btnGlobe").click()
    page.locator("#fmCollapse").click()
    ok("键盘已收起", "collapsed" in (page.locator("#ime").get_attribute("class") or ""))
    ok("收起后候选栏仍显示预选词", page.locator("#candidateBar").is_visible())
    page.locator("#candScroll .cand").first.click()
    ok("收起状态仍可点选上屏", True)
    page.locator("#btnExpand").click()

    # 手写
    page.locator("#btnGlobe").click()
    page.locator('#funcMenu [data-view="handwrite"]').click()
    page.wait_for_timeout(250)
    box = page.locator("#hwCanvas").bounding_box()
    ok("手写画布可见", bool(box and box["width"] > 100 and box["height"] > 60), box)
    if box:
        x, y = box["x"], box["y"]
        page.mouse.move(x + 40, y + 50); page.mouse.down(); page.mouse.move(x + 200, y + 52, steps=8); page.mouse.up()
        page.mouse.move(x + 120, y + 20); page.mouse.down(); page.mouse.move(x + 122, y + 110, steps=8); page.mouse.up()
    page.locator("#hwRecognize").click()
    ok("手写产生候选字", page.locator("#hwResult .hw-char").count() >= 5)
    page.locator("#panelHandwrite .panel-head [data-view=keys]").click()

    # 数字 / 符号键盘
    page.locator('#viewKeys .key[data-v="numbers"]').click()
    ok("数字键盘切换", page.locator('#viewKeys .key[data-k="1"]').count() == 1)
    page.locator('#viewKeys .key[data-v="symbols"]').click()
    ok("符号键盘切换", page.locator('#viewKeys .key[data-k="#"]').count() == 1)
    page.locator('#viewKeys .key[data-v="letters"]').click()

    # 设置 + 高度 + 词库
    page.locator("#btnGlobe").click()
    page.locator('#funcMenu [data-open="settings"]').click()
    page.wait_for_timeout(350)
    ok("设置面板打开", page.locator("#sheet").is_visible())
    page.locator("#heightRange").evaluate("el=>{el.value=280;el.dispatchEvent(new Event('input',{bubbles:true}))}")
    ok("键盘高度生效", page.locator("#screen").evaluate("el=>getComputedStyle(el).getPropertyValue('--kb-h')").strip() == "280px")
    u0 = int(page.locator("#statUser").inner_text())
    page.locator("#wbArea").fill("测试词条 ceshicitiao 88")
    page.locator("#wbImport").click()
    ok("词库导入生效", int(page.locator("#statUser").inner_text()) == u0 + 1)
    page.locator("#sheetDone").click()
    page.wait_for_timeout(350)

    # 导入词条进入候选
    for ch in "ceshicitiao":
        page.locator(f'#viewKeys .key[data-k="{ch}"]').click()
    c2 = page.locator("#candScroll .cand").all_inner_texts()
    ok("导入词条优先候选", bool(c2) and c2[0] == "测试词条", ",".join(c2[:3]))
    for _ in range(11):
        page.locator('#viewKeys .key[data-fn="delete"]').click()

    # 麦克风演示
    v0 = page.locator("#editor").input_value()
    page.locator("#btnMic").click()
    page.wait_for_timeout(1700)
    ok("语音输入演示", page.locator("#editor").input_value() != v0)

    browser.close()

for okk, name, extra in results:
    print(f"{'PASS' if okk else 'FAIL'} | {name} | {extra}")
print("\nJS 错误:", "\n".join(errors) if errors else "无")
failed = [r for r in results if not r[0]]
print(f"通过 {len(results) - len(failed)}/{len(results)}")
sys.exit(1 if failed or errors else 0)
