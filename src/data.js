/* ============ KeyFlow 本地引擎数据 ============ */
window.KF_DATA = (function () {

  /* 合法拼音音节表（用于字母串切分） */
  const SYLLABLE_RAW = `a ai an ang ao ba bai ban bang bao bei ben beng bi bian biao bie bin bing bo bu
  ca cai can cang cao ce cen ceng cha chai chan chang chao che chen cheng chi chong chou chu chua chuai chuan chuang chui chun chuo ci cong cou cu cuan cui cun cuo
  da dai dan dang dao de dei den deng di dia dian diao die ding dong dou du duan dui dun duo
  e ei en eng er fa fan fang fei fen feng fo fou fu
  ga gai gan gang gao ge gei gen geng gong gou gu gua guai guan guang gui gun guo
  ha hai han hang hao he hei hen heng hong hou hu hua huai huan huang hui hun huo
  ji jia jian jiang jiao jie jin jing jiong jiu ju juan jue jun
  ka kai kan kang kao ke ken keng kong kou ku kua kuai kuan kuang kui kun kuo
  la lai lan lang lao le lei leng li lia lian liang liao lie lin ling liu long lou lu luan lun luo lv lue
  ma mai man mang mao me mei men meng mi mian miao mie min ming miu mo mou mu
  na nai nan nang nao ne nei nen neng ni nian niang niao nie nin ning niu nong nou nu nuan nuo nv nve
  o ou pa pai pan pang pao pei pen peng pi pian piao pie pin ping po pou pu
  qi qia qian qiang qiao qie qin qing qiong qiu qu quan que qun
  ran rang rao re ren reng ri rong rou ru rua ruan rui run ruo
  sa sai san sang sao se sen seng sha shai shan shang shao she shei shen sheng shi shou shu shua shuai shuan shuang shui shun shuo si song sou su suan sui sun suo
  ta tai tan tang tao te teng ti tian tiao tie ting tong tou tu tuan tui tun tuo
  wa wai wan wang wei wen weng wo wu
  xi xia xian xiang xiao xie xin xing xiong xiu xu xuan xue xun
  ya yan yang yao ye yi yin ying yo yong you yu yuan yue yun
  za zai zan zang zao ze zei zen zeng zha zhai zhan zhang zhao zhe zhei zhen zheng zhi zhong zhou zhu zhua zhuai zhuan zhuang zhui zhun zhuo zi zong zou zu zuan zui zun zuo`;
  const SYLLABLES = new Set(SYLLABLE_RAW.split(/\s+/).filter(Boolean));

  /* 拼音 → 候选词/字（每行：拼音 候选1 候选2 …） */
  const DICT_RAW = `
a 啊 阿 呵 吖 腌
ai 爱 矮 挨 唉 艾 碍 癌 哀
an 安 按 案 暗 岸 俺 鞍
ba 吧 把 八 爸 巴 拔 罢 霸 坝
bai 白 百 摆 败 拜 柏 佰
ban 板 版 办 半 般 班 搬 伴 颁 瓣
bang 帮 棒 榜 邦 膀 绑
bao 包 报 保 抱 宝 饱 爆 薄 豹
bei 被 北 备 倍 杯 背 悲 贝 辈
ben 本 笨 奔 份
bi 比 笔 必 避 闭 壁 币 碧 毕 逼
bian 边 变 便 遍 编 辩 鞭 扁 贬 辨
biao 表 标 彪 镖 婊
bie 别 憋 鳖 蹩
bin 宾 滨 彬 斌 鬓
bing 并 病 冰 饼 兵 丙 柄 秉
bo 波 播 博 拨 伯 薄 泊 脖 玻
bu 不 部 步 布 补 捕 怖 簿
cai 才 菜 采 财 材 彩 裁 猜
can 参 餐 残 惨 灿 蚕
ce 测 策 册 侧 厕
cen 参
ceng 层 曾 蹭
cha 查 茶 差 察 插 叉 诧
chai 拆 柴 豺
chan 产 谈 禅 缠 铲 阐
chang 长 常 场 唱 厂 尝 畅 偿 肠
chao 超 朝 潮 吵 炒 抄 巢
che 车 彻 撤 扯 澈
chen 陈 沉 晨 臣 尘 衬 趁
cheng 成 城 程 称 承 乘 诚 惩 澄
chi 吃 迟 持 池 尺 赤 翅 斥 弛
chu 出 处 初 除 触 楚 储 厨 础
chuan 传 船 穿 川 串 喘
chuang 窗 床 创 闯 疮
chui 吹 垂 锤 炊 捶
chun 春 纯 唇 蠢 醇
ci 词 次 此 刺 磁 辞 瓷 慈 赐
cong 从 丛 聪 葱 囱
cu 粗 促 醋 簇 卒
cun 村 存 寸 措
cuo 错 措 挫 搓 锉
da 大 打 达 答 搭 哒
dai 带 代 待 戴 袋 呆 贷 逮
dan 但 单 淡 蛋 担 丹 胆 弹
dang 当 党 挡 档 荡
dao 到 道 导 岛 倒 刀 盗 稻 悼
de 的 得 德 地
deng 等 灯 登 邓 瞪 凳
di 地 第 低 底 敌 抵 滴 帝 递
dian 点 电 店 典 垫 殿 颠
diao 掉 调 钓 雕 刁 吊
ding 定 顶 订 丁 钉 鼎 叮
dong 动 东 懂 冬 洞 冻 董 栋
dou 都 斗 豆 抖 陡 逗
du 度 读 独 都 毒 渡 督 堵 赌 杜
duan 段 断 短 端 锻 缎
dui 对 队 堆 兑 敦
dun 顿 盾 蹲 吨 钝
duo 多 朵 躲 夺 舵 堕 咄
e 额 恶 饿 鹅 厄 扼
er 而 二 儿 耳 尔 饵
fa 法 发 罚 乏 伐 筏 阀
fan 反 饭 烦 范 翻 凡 返 贩
fang 方 放 房 防 访 纺 仿 芳
fei 非 飞 费 肥 废 肺 啡
fen 分 份 粉 奋 纷 氛 坟
feng 风 封 丰 疯 峰 锋 蜂 逢
fu 复 服 福 附 府 负 夫 父 富 妇 付 幅 扶 浮 符 腐 辅 抚
gai 该 改 盖 概 钙 溉
gan 感 干 敢 赶 甘 肝 杆 尴
gang 刚 钢 港 岗 纲 缸
gao 高 搞 告 稿 膏 糕 篙
ge 个 各 歌 格 哥 隔 割 革 阁
gei 给
gen 跟 根 亘
geng 更 耕 耿 哽
gong 功 工 公 共 供 宫 弓 攻 恭 贡 拱
gou 够 狗 构 购 勾 沟 钩
gu 古 故 顾 固 骨 鼓 股 谷 姑
gua 挂 瓜 刮 寡 卦
guai 怪 拐 乖
guan 关 观 管 馆 惯 冠 灌 罐
guang 光 广 逛 胱
gui 贵 规 归 柜 鬼 桂 跪
gun 滚 棍
guo 国 过 果 锅 裹 郭
hai 还 海 害 孩 嗨 亥
han 汉 喊 含 寒 汗 韩 函 旱
hang 行 航 杭 夯
hao 好 号 豪 毫 耗 浩 嚎
he 和 喝 合 何 河 盒 贺 核 荷
hei 黑 嘿
hen 很 狠 恨 痕
heng 横 恒 衡 哼
hong 红 宏 洪 轰 虹 哄
hou 后 候 厚 猴 喉 吼
hu 户 护 互 湖 呼 胡 虎 忽 糊 壶
hua 话 花 画 化 华 划 滑 哗
huai 坏 怀 淮 徊
huan 换 还 环 欢 缓 患 幻 唤 焕
huang 黄 皇 慌 晃 谎 荒 煌
hui 会 回 挥 灰 恢 辉 惠 汇 慧
hun 混 婚 昏 魂 荤
huo 或 火 活 货 获 伙 惑 霍
ji 计 机 几 及 基 级 记 即 集 济 寄 击 极 际 季 纪 技 继 剂 疾 急 积 鸡 迹 吉
jia 家 加 假 价 架 甲 佳 夹 驾
jian 键 剪 见 件 简 间 建 减 检 健 坚 肩 兼 艰 监 尖 箭 剑 渐 荐
jiang 将 江 讲 奖 降 姜 匠 酱
jiao 叫 教 脚 交 角 焦 骄 浇 搅
jie 节 接 结 解 界 街 姐 借 介 届 戒 截 杰 捷 洁 阶 揭
jin 今 进 金 近 仅 紧 尽 禁 津 斤 谨 锦
jing 经 京 精 静 竟 境 镜 警 竞 净 井 景
jiu 就 九 久 酒 旧 救 究 纠
ju 局 据 句 举 具 剧 距 巨 聚 拒
jue 决 觉 绝 角 爵 掘 倔
jun 军 君 均 俊 菌 峻
kai 开 凯 慨 楷
kan 看 砍 刊 坎 勘
kang 康 抗 扛 炕
kao 考 靠 烤 拷 铐
ke 可 课 克 客 刻 渴 科 颗 壳 咳
ken 肯 垦 恳 啃
kong 空 控 孔 恐 崆
kou 口 扣 寇 叩
ku 库 酷 苦 哭 裤 枯 窟
kua 跨 夸 垮 挎
kuai 快 块 筷 会
kuan 宽 款
kuang 况 框 狂 矿 旷
kui 亏 葵 魁 愧 溃
kun 困 昆 捆
kuo 扩 阔 括
lai 来 赖 莱 睐
lan 蓝 兰 拦 篮 懒 烂 览 滥
lang 浪 狼 郎 廊 朗
lao 老 劳 牢 捞 唠 姥
le 了 乐 勒
lei 类 累 泪 雷 蕾 垒
leng 冷 愣 棱
li 里 力 理 立 李 例 离 历 利 礼 丽 励
lian 连 联 练 脸 恋 炼 链 莲 廉 帘 怜
liang 两 量 亮 良 凉 辆 梁 谅
liao 了 料 聊 疗 辽 寥
lie 列 烈 裂 劣 猎
lin 林 临 邻 淋 磷 鳞
ling 领 令 另 灵 零 龄 铃 岭
liu 六 流 留 刘 柳 溜
long 龙 笼 隆 聋 垄
lou 楼 漏 搂 陋
lu 路 录 陆 露 鲁 炉 鹿 卢
luan 乱 卵 峦
lun 论 轮 伦 仑
luo 落 罗 络 洛 螺 裸
ma 吗 妈 马 码 骂 麻 嘛
mai 买 卖 麦 脉 迈 埋
man 满 慢 曼 漫 瞒 蛮
mang 忙 盲 茫 芒
mao 毛 猫 帽 冒 貌 矛 贸
me 么
mei 没 美 每 妹 梅 媒 眉 媚
men 们 门 闷 扪
meng 梦 猛 蒙 盟 懵
mi 米 密 迷 蜜 秘 谜 觅
mian 面 免 棉 眠 勉 缅
miao 秒 苗 妙 描 庙
min 民 敏 闽 抿
ming 明 名 命 鸣 铭 冥
mo 摸 莫 末 默 模 魔 磨 墨 膜
mou 某 谋 眸
mu 木 目 母 幕 墓 慕 牧 睦
na 那 拿 哪 纳 娜 呐
nan 难 男 南 楠 喃
nao 脑 闹 恼 挠
ne 呢
nei 内
neng 能
ni 你 尼 呢 泥 拟 逆 腻 匿
nian 年 念 粘 碾 撵
niang 娘 酿
niao 鸟 尿 袅
nin 您
ning 宁 凝 拧 狞
niu 牛 扭 纽 钮
nong 弄 农 浓 脓
nu 努 怒 奴
nuan 暖
nuo 诺 挪 懦 糯
pai 派 排 拍 牌 徘
pan 判 盘 盼 叛 攀
pang 旁 胖 庞 膀
pao 跑 泡 抛 炮 袍
pei 配 陪 赔 培 佩
peng 朋 碰 棚 鹏 膨 捧
pi 皮 批 披 疲 匹 脾 啤
pian 片 篇 偏 骗 便
piao 票 飘 漂 瓢
pin 品 拼 贫 频 聘
ping 平 评 瓶 凭 苹 屏 萍
po 破 颇 坡 泼 婆 迫
pu 普 铺 扑 朴 谱 浦
qi 起 气 七 其 期 齐 奇 骑 启 器 汽 棋 欺 妻 企 岂 弃
qia 恰 卡 掐
qian 前 钱 千 签 浅 欠 牵 迁 谦
qiang 强 抢 墙 枪 腔
qiao 桥 巧 敲 瞧 乔 悄 俏
qie 切 且 窃 怯 惬
qin 亲 勤 琴 秦 侵 寝
qing 请 清 情 轻 青 晴 庆 倾
qiu 求 球 秋 丘 囚
qu 去 区 取 曲 趣 驱 屈 渠
quan 全 权 劝 圈 泉 犬 拳
que 却 确 缺 雀 鹊
qun 群 裙
ran 然 燃 染
rang 让 嚷 壤
rao 绕 扰 饶
re 热 惹
ren 人 任 认 忍 仁 刃
reng 仍 扔
ri 日
rong 容 荣 融 绒 溶
rou 肉 柔 揉
ru 入 如 儒 乳 辱 汝
ruan 软
rui 瑞 锐 蕊
run 润
ruo 若 弱
sai 赛 塞
san 三 散 伞
sang 桑 嗓 丧
sao 扫 骚 嫂
se 色 涩 瑟
sha 沙 杀 傻 纱 刹 啥
shai 晒 筛
shan 山 善 闪 扇 删 衫
shang 上 商 伤 尚 赏 裳
shao 少 烧 稍 哨 勺 绍
she 设 社 射 舍 摄 涉 蛇 舌
shei 谁
shen 什 深 身 伸 神 审 甚 婶 申
sheng 生 声 升 胜 省 圣 绳 盛 剩
shi 是 时 十 事 使 式 试 诗 市 实 识 食 石 师 失 施 世 视 示 室 适 史 始 士 势
shou 手 收 受 首 瘦 守 授 兽 寿 售
shu 输 书 树 数 叔 舒 属 熟 术 束 述 殊 疏 蔬
shuai 帅 摔 甩 衰
shuan 拴 栓
shuang 双 爽 霜
shui 水 谁 睡 税
shun 顺 瞬 舜
shuo 说 硕 烁
si 四 死 思 私 丝 司 斯 撕
song 送 松 宋 耸 诵
sou 搜 艘 嗽
su 速 素 诉 塑 苏 俗 宿 肃
suan 算 酸 蒜
sui 随 岁 虽 碎 遂 穗
sun 孙 损 笋
suo 所 锁 缩 索 唆
ta 他 她 它 塔 踏 塌
tai 太 台 抬 态 泰 胎
tan 谈 弹 探 摊 贪 滩 坛
tang 汤 糖 躺 趟 堂 唐 烫
tao 套 逃 桃 讨 淘 陶
te 特
teng 疼 腾 藤
ti 提 题 体 替 踢 梯 剔
tian 天 田 添 甜 填 舔
tiao 调 条 跳 挑 迢
tie 铁 贴 帖
ting 听 停 厅 挺 庭 廷 艇
tong 同 通 统 痛 铜 童 筒 桶 桐
tou 头 投 透 偷
tu 图 土 突 途 徒 吐 兔 涂
tuan 团 推
tui 推 腿 退 褪
tun 吞 屯 臀
tuo 脱 拖 托 妥 拓 驼
wai 外 歪
wan 完 万 晚 玩 弯 碗 挽
wang 王 网 往 望 忘 旺 汪
wei 为 位 未 味 卫 威 微 伟 围 维 唯 危 尾 委
wen 文 问 闻 温 稳 纹 吻
weng 翁 嗡
wo 我 窝 握 沃 喔
wu 无 五 物 务 误 屋 舞 午 武 吴 乌 污 悟 雾
xi 系 西 细 习 喜 洗 戏 吸 希 息 席 析 稀 溪 锡 熄
xia 下 夏 吓 峡 侠 暇 霞 狭 虾
xian 现 先 线 见 县 显 险 鲜 限 献 闲
xiang 想 向 象 相 香 响 乡 详 箱 享
xiao 小 笑 校 消 销 晓 效 肖 孝 萧
xie 写 谢 些 鞋 斜 携 泄 械 卸 屑 谐 歇
xin 新 心 信 辛 欣 薪 芯
xing 行 星 性 型 兴 形 姓 醒 幸
xiong 兄 胸 熊 凶 雄
xiu 修 休 秀 袖 绣 锈
xu 需 须 许 续 序 虚 徐 蓄 叙
xuan 选 宣 悬 旋 玄 轩 炫 绚
xue 学 雪 血 穴 削
xun 寻 训 迅 循 询 旬 巡
ya 呀 压 牙 亚 鸭 雅 芽
yan 眼 言 演 严 研 验 烟 盐 沿 燕 颜
yang 样 阳 洋 养 央 羊 仰 氧
yao 要 药 摇 腰 邀 遥 咬 耀
ye 也 业 夜 叶 爷 野 液 页
yi 一 以 已 意 义 医 衣 依 易 亦 亿 异 议 译 艺 忆 益 移 遗 宜 椅 疑 仪
yin 因 音 引 印 银 饮 隐 阴 瘾
ying 应 英 影 营 硬 赢 迎 映 盈 颖 鹰
yong 用 永 勇 拥 涌 泳 咏 庸
you 有 又 右 由 友 游 油 尤 优 邮 幽 悠 诱
yu 与 于 语 雨 鱼 遇 余 玉 育 欲 域 予 羽 宇 御 誉 豫 裕 郁 娱 愚 愉
yuan 原 元 远 院 圆 愿 员 源 园 缘 援 怨 苑
yue 月 约 越 阅 跃 乐 岳 悦
yun 云 运 允 孕 韵 晕 匀
za 杂 砸 咋
zai 在 再 载 灾 栽 宰
zan 咱 赞 暂 攒
zang 脏 藏 葬
zao 早 造 遭 糟 燥 澡 枣
ze 则 责 择 泽
zeng 增 赠 曾
zha 扎 炸 渣 眨 诈
zhai 摘 窄 债 宅
zhan 站 占 战 展 沾 粘 斩 盏
zhang 长 张 章 涨 掌 帐 障 丈
zhao 找 着 照 招 朝 赵 兆 爪 罩
zhe 这 着 者 折 哲 浙 遮
zhen 震 真 针 阵 珍 诊 枕 振 镇 贞 侦
zheng 正 整 政 证 争 征 郑 挣 蒸
zhi 只 之 知 直 值 制 纸 指 支 至 治 质 志 职 致 执 置 殖
zhong 中 种 重 众 终 忠 钟 仲
zhou 周 州 洲 舟 粥 皱 骤
zhu 主 住 注 助 逐 珠 朱 猪 竹 煮 祝 驻
zhuan 转 专 传 砖 赚
zhuang 装 状 庄 壮 撞 幢
zhui 追 坠 缀
zhun 准
zhuo 桌 捉 卓 拙 灼
zi 字 自 子 紫 资 仔 姿 滋 兹 咨 籽 梓
zong 总 纵 宗 综 踪
zou 走 奏 揍
zu 组 足 祖 租 阻 族
zuan 钻 赚
zui 最 嘴 醉 罪
zun 尊 遵
zuo 做 作 左 坐 座 昨 佐
nihao 你好 逆好
woaini 我爱你
zhongguo 中国
renmin 人民
shurufa 输入法
jianqieban 剪贴板
ciku 词库 辞库
daoru 导入
zhendong 震动 振动
gaodu 高度
shouqi 收起 手气
jianpan 键盘
yuxuanci 预选词
bianxiebianyi 边写边译
shouxiezhaozi 手写找字
shouxie 手写 收写
zhaozi 找字 照字
tiaojie 调节 调解
gongneng 功能
jiemian 界面
sheji 设计 涉及
yonghu 用户
huanying 欢迎
yingyong 应用
shouji 手机 收集
zidingyi 自定义
shuru 输入
fanyi 翻译
shibie 识别
zidong 自动
baocun 保存
qingkong 清空
tianjia 添加
fuzhi 复制
charu 插入
tihuan 替换
zhongwen 中文
yingwen 英文
jintian 今天
mingtian 明天
zuotian 昨天
xianzai 现在
shijian 时间
pengyou 朋友
shenghuo 生活
meihao 美好
anquan 安全
fangbian 方便
kuaijie 快捷
gaoxiao 高效
zhuanye 专业
wanmei 完美
wangluo 网络
fenxiang 分享
xiexie 谢谢
zaijian 再见
duibuqi 对不起
meiguanxi 没关系
shenme 什么
weishenme 为什么
zenme 怎么
keyi 可以
yinggai 应该
xihuan 喜欢
gongzuo 工作
xuexi 学习
meitian 每天
yidian 一点
zheli 这里
nali 那里
women 我们
nimen 你们
tamen 他们
dajia 大家
shijie 世界
kaixin 开心
kuaile 快乐
haode 好的
shoudao 收到
qing 请
ninhao 您好
zaoshang 早上
wanan 晚安
chifan 吃饭
heshui 喝水
dianhua 电话
xinxi 信息
beiwanglu 备忘录
cidian 词典
lianxiang 联想
shangping 上屏
anniu 按钮
gongju 工具
lan 栏
zhuangtai 状态
moshi 模式
pinyin 拼音
yingwenmoshi 英文模式
`;
  const DICT = {};
  DICT_RAW.trim().split('\n').forEach(line => {
    const p = line.trim().split(/\s+/);
    if (p.length >= 2) DICT[p[0]] = p.slice(1);
  });

  /* 汉字 → 拼音（用于导入词库自动注音，覆盖常用字） */
  const HZ_PY_RAW = `啊a 爱ai 安an 八ba 白bai 板ban 帮bang 包bao 被bei 本ben 比bi 边bian 表biao 别bie 并bing 波bo 不bu 才cai 参can 层ceng 查cha 产chan 长chang 超chao 车che 陈chen 成cheng 吃chi 出chu 传chuan 窗chuang 春chun 词ci 从cong 粗cu 村cun 错cuo 大da 带dai 但dan 当dang 到dao 的de 等deng 地di 点dian 调diao 定ding 动dong 都dou 度du 段duan 对dui 多duo 额e 而er 法fa 反fan 方fang 非fei 分fen 风feng 复fu 该gai 感gan 刚gang 高gao 个ge 给gei 跟gen 更geng 功gong 够gou 古gu 挂gua 怪guai 关guan 光guang 贵gui 国guo 还hai 汉han 行hang 好hao 和he 黑hei 很hen 横heng 红hong 后hou 户hu 话hua 坏huai 换huan 黄huang 会hui 混hun 或huo 计ji 家jia 键jian 剪jian 将jiang 叫jiao 节jie 今jin 经jing 就jiu 局ju 决jue 军jun 开kai 看kan 康kang 考kao 可ke 肯ken 空kong 口kou 库ku 跨kua 快kuai 宽kuan 况kuang 亏kui 困kun 扩kuo 来lai 蓝lan 浪lang 老lao 了le 类lei 冷leng 里li 连lian 两liang 了liao 列lie 林lin 领ling 六liu 龙long 楼lou 路lu 乱luan 论lun 落luo 吗ma 买mai 满man 忙mang 毛mao 么me 没mei 们men 梦meng 米mi 面mian 秒miao 民min 明ming 摸mo 某mou 木mu 那na 难nan 脑nao 呢ne 内nei 能neng 你ni 年nian 娘niang 鸟niao 您nin 宁ning 牛niu 弄nong 努nu 暖nuan 诺nuo 派pai 判pan 旁pang 跑pao 配pei 朋peng 皮pi 片pian 票piao 品pin 平ping 破po 普pu 起qi 恰qia 前qian 强qiang 桥qiao 切qie 亲qin 请qing 求qiu 去qu 全quan 却que 群qun 然ran 让rang 绕rao 热re 人ren 仍reng 日ri 容rong 肉rou 入ru 软ruan 瑞rui 润run 若ruo 赛sai 三san 桑sang 扫sao 色se 沙sha 晒shai 山shan 上shang 少shao 设she 谁shei 什shen 生sheng 是shi 手shou 输shu 帅shuai 双shuang 水shui 顺shun 说shuo 四si 送song 搜sou 速su 算suan 随sui 孙sun 所suo 他ta 太tai 谈tan 汤tang 套tao 特te 疼teng 提ti 天tian 调tiao 铁tie 听ting 同tong 头tou 图tu 团tuan 推tui 吞tun 脱tuo 外wai 完wan 王wang 为wei 文wen 翁weng 我wo 无wu 系xi 下xia 现xian 想xiang 小xiao 写xie 新xin 行xing 兄xiong 修xiu 需xu 选xuan 学xue 寻xun 呀ya 眼yan 样yang 要yao 也ye 一yi 因yin 应ying 用yong 有you 与yu 原yuan 月yue 云yun 杂za 在zai 咱zan 脏zang 早zao 则ze 增zeng 扎zha 摘zhai 站zhan 长zhang 找zhao 这zhe 震zhen 正zheng 只zhi 中zhong 周zhou 主zhu 转zhuan 装zhuang 追zhui 准zhun 桌zhuo 字zi 总zong 走zou 组zu 钻zuan 最zui 尊zun 做zuo
预yu 选xuan 词ci 收shou 起qi 键jian 盘pan 输shu 法fa 剪jian 贴tie 板ban 库ku 导dao 入ru 震zhen 动dong 高gao 度du 手shou 写xie 找zhao 边bian 译yi 功gong 能neng 界jie 面mian 设she 计ji 用yong 户hu 欢huan 迎ying 自zi 定ding 义yi 输shu 入ru 翻fan 识shi 别bie 保bao 存cun 清qing 空kong 添tian 加jia 复fu 制zhi 插cha 换huan 文wen 英ying 今jin 明ming 昨zuo 现xian 时shi 间jian 朋peng 友you 生sheng 活huo 美mei 安an 全quan 方fang 便bian 快kuai 捷jie 效xiao 专zhuan 业ye 完wan 网wang 络luo 分fen 享xiang 谢xie 再zai 见jian 对dui 不bu 没mei 关guan 什shen 么me 为wei 怎zen 可ke 以yi 应ying 该gai 喜xi 欢huan 工gong 作zuo 学xue 习xi 每mei 点dian 这zhe 里li 那na 我wo 们men 大da 家jia 世shi 开kai 心xin 乐le 好hao 的de 到dao 请qing 您nin 早zao 晚wan 吃chi 饭fan 喝he 水shui 电dian 话hua 信xin 息xi 备bei 忘wang 录lu 典dian 联lian 上shang 屏ping 按an 钮niu 工gong 具ju 栏lan 状zhuang 态tai 模mo 式shi 拼pin 音yin 您nin 收shou 到dao 震zhen 感gan 触chu 反fan 馈kui 音yin 效xiao 外wai 观guan 深shen 色se 浅qian 数shu 字zi 符fu 号hao 表biao 情qing 候hou 选xuan 联lian 想xiang 智zhi 能neng 本ben 地di 离li 线xian 测ce 试shi`;
  const HZ_PY = {};
  HZ_PY_RAW.trim().split(/\s+/).forEach(t => { HZ_PY[t[0]] = t.slice(1); });

  /* 中 → 英 演示词典 */
  const ZHEN_RAW = `
你好=Hello
您好=Hello
谢谢=Thank you
再见=Goodbye
对不起=Sorry
没关系=It's OK
不客气=You're welcome
早上好=Good morning
晚安=Good night
我爱你=I love you
今天=today
明天=tomorrow
昨天=yesterday
现在=now
时间=time
天气=weather
很好=very good
非常好=very good
世界=world
朋友=friend
生活=life
美好=beautiful
开心=happy
快乐=happy
喜欢=like
爱=love
我=I
你=you
您=you
他=he
她=she
我们=we
你们=you
他们=they
大家=everyone
是=is
不是=is not
有=have
没有=don't have
在=at
这=this
那=that
什么=what
为什么=why
怎么=how
可以=can
应该=should
很=very
好=good
坏=bad
大=big
小=small
多=many
少=few
的=of
和=and
与=and
或=or
了=.
吗=?
呢=?
吧=.
请=please
欢迎=welcome
使用=use
这款=this
输入法=input method
键盘=keyboard
剪贴板=clipboard
手写=handwriting
找字=find characters
翻译=translate
边写边译=live translation
词库=dictionary
导入=import
震动=haptic feedback
高度=height
调节=adjust
功能=feature
界面=interface
设计=design
用户=user
自定义=custom
输入=input
文字=text
识别=recognition
自动=automatic
保存=save
清空=clear
添加=add
复制=copy
插入=insert
替换=replace
中文=Chinese
英文=English
手机=phone
应用=app
收起=collapse
预选词=candidate words
候选=candidate
联想=prediction
上屏=commit
按钮=button
工具=tool
备忘录=Notes
信息=message
电话=phone call
吃饭=have a meal
喝水=drink water
工作=work
学习=study
每天=every day
一点=a little
这里=here
那里=there
中国=China
北京=Beijing
会议=meeting
纪要=minutes
上午=morning
点=o'clock
收货=delivery
地址=address
测试=test
完成=done
开始=start
一款=a
原生=native
风格=style
高保真=high-fidelity
交互=interactive
原型=prototype
支持=support
无需=no need
联网=internet
本地=local
引擎=engine
，=,
。=.
！=!
？=?
、=,
；=;
：=:
`;
  const ZHEN = {};
  ZHEN_RAW.trim().split('\n').forEach(l => {
    const i = l.indexOf('=');
    if (i > 0) ZHEN[l.slice(0, i).trim()] = l.slice(i + 1).trim();
  });

  /* 英 → 中 补充 */
  const ENZH_RAW = `hello=你好 hi=嗨 thanks=谢谢 thank=谢谢 goodbye=再见 sorry=抱歉 yes=是的 no=不 ok=好的 today=今天 tomorrow=明天 yesterday=昨天 now=现在 time=时间 weather=天气 good=好 bad=坏 very=很 beautiful=美丽 happy=开心 love=爱 like=喜欢 i=我 you=你 he=他 she=她 we=我们 they=他们 is=是 are=是 am=是 have=有 this=这 that=那 what=什么 why=为什么 how=怎么 can=可以 should=应该 please=请 welcome=欢迎 use=使用 keyboard=键盘 clipboard=剪贴板 handwriting=手写 translate=翻译 dictionary=词典 import=导入 haptic=触感 height=高度 feature=功能 interface=界面 design=设计 user=用户 input=输入 text=文字 chinese=中文 english=英文 phone=手机 app=应用 notes=备忘录 meeting=会议 address=地址 test=测试 done=完成 start=开始 world=世界 life=生活 friend=朋友 china=中国`; 
  const ENZH = {};
  ENZH_RAW.trim().split(/\s+/).forEach(t => { const i = t.indexOf('='); if (i > 0) ENZH[t.slice(0, i)] = t.slice(i + 1); });
  Object.keys(ZHEN).forEach(zh => { const en = ZHEN[zh].toLowerCase(); if (/^[a-z' ]+$/.test(en) && !ENZH[en]) ENZH[en] = zh; });

  /* 手写演示字库：字|笔画数|宽高比|横笔|竖笔|斜笔 */
  const HAND_RAW = `
一|1|3.6|1|0|0
二|2|3.2|2|0|0
三|3|3.0|3|0|0
十|2|1.0|1|1|0
丁|2|1.4|1|1|0
人|2|1.0|0|0|2
八|2|1.1|0|0|2
入|2|1.0|0|0|2
儿|2|0.9|0|1|1
大|3|1.3|1|0|2
小|3|1.0|0|1|2
山|3|1.2|1|2|0
口|3|1.2|2|2|0
川|3|1.1|0|3|0
上|3|1.0|2|1|0
下|3|1.1|1|1|1
之|3|1.3|1|0|2
子|3|1.1|2|1|0
女|3|1.0|1|0|2
门|3|0.9|1|2|0
日|4|0.9|3|3|0
月|4|0.8|2|3|1
水|4|1.0|0|1|3
火|4|1.0|0|1|3
木|4|1.0|1|1|2
中|4|1.0|2|2|0
手|4|1.0|3|1|1
文|4|1.1|1|0|3
心|4|1.2|0|1|3
王|4|1.1|3|1|0
天|4|1.2|2|0|2
不|4|1.1|1|1|2
开|4|1.1|2|2|0
方|4|1.0|1|1|2
五|4|1.2|3|1|0
写|5|1.0|2|2|1
字|6|1.0|2|2|2
好|6|1.0|2|2|2
我|7|1.0|2|2|3
你|7|1.0|1|2|4
词|7|1.0|2|2|3
库|7|1.0|2|2|3
输|13|1.0|2|3|4
入|2|1.0|0|0|2
法|8|1.0|2|2|3
键|13|1.0|3|3|3
盘|11|1.0|3|3|3
`;
  const HAND = HAND_RAW.trim().split('\n').map(l => {
    const p = l.split('|');
    return { c: p[0], n: +p[1], ratio: +p[2], h: +p[3], v: +p[4], d: +p[5] };
  });

  const EMOJIS = ('😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😋 😛 🤪 🤨 🧐 🤓 😎 🥳 😏 😒 😞 😔 😢 😭 😤 😠 🤯 😱 🥺 😴 🤔 🤗 🤭 🫡 👍 👎 👏 🙌 🤝 💪 🙏 ✌️ 🤟 👌 🤞 ✨ ❤️ 🧡 💛 💚 💙 💜 🖤 💯 🔥 🎉 🎊 🌈 ☀️ 🌙 ⭐ 🌸 🍎 ☕ 📱 💻 ⌨️ 📋 📝 ✏️ 🔍 ⚙️ ✅ ❌').split(' ');
  const PUNCTS = ('， 。 ！ ？ 、 ； ： “ ” ‘ ’ （ ） 【 】 … — ～ · ￥').split(' ');

  return { SYLLABLES, DICT, HZ_PY, ZHEN, ENZH, HAND, EMOJIS, PUNCTS };
})();
