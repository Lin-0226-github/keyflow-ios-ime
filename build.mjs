/** KeyFlow 构建脚本：把 src/ 下的源码编译（内联）为单文件 index.html */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const read = p => readFileSync(join(root, p), 'utf8');

const tpl = read('src/template.html');
const css = read('src/style.css');
const data = read('src/data.js');
const app = read('src/app.js');

// 必须使用函数式替换：源码中的 $$ 等字符在字符串替换里会被当作特殊序列
let html = tpl
  .replace('<!-- __STYLE__ -->', () => `<style>\n${css}\n</style>`)
  .replace('<!-- __SCRIPT__ -->', () => `<script>\n${data}\n</script>\n<script>\n${app}\n</script>`);

if (html.includes('__STYLE__') || html.includes('__SCRIPT__')) {
  throw new Error('构建失败：模板占位符未全部替换');
}

const outputs = ['index.html', '_site/index.html', 'ios/Web/index.html'];
for (const out of outputs) {
  mkdirSync(join(root, out, '..'), { recursive: true });
  writeFileSync(join(root, out), html, 'utf8');
}

console.log(`✓ 编译完成：${outputs.join(' + ')} (${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(1)} KB)`);
