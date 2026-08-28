# 声屿 Soundscape 🌊

> 把世界调成喜欢的声音 —— 极简白噪声小应用。

纯前端、零依赖、无外部服务的白噪声应用，使用**现成录制的高质量音频**（无损 WAV、无缝循环），即开即听。

![cover](https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=dark%20immersive%20ambient%20app%20interface%20with%20rain%20sound%20waves%20and%20a%20glowing%20circular%20dial%2C%20soft%20blue%20tones&image_size=landscape_16_9)

## ✨ 功能

- **6 种真实录音**：雨声、海浪、壁炉、咖啡馆、深夜林、风扇（无损 WAV，`AudioBufferSourceNode` 无缝循环）
- **多声音混合**：同时叠加多种声音，每种独立调节音量（可拖拽）
- **沉浸式视觉**：氛围色随声音联动，中央圆盘呼吸波纹动画
- **定时关闭**：15 / 30 / 60 分钟，到时声音缓缓淡出
- **移动端优先**：手机壳式布局，桌面端居中显示

## 🚀 运行

无需构建，直接打开 `index.html`，或启动任意静态服务器：

```bash
python3 -m http.server 8000
# 访问 http://localhost:8000
```

> 提示：需通过 HTTP 访问（`fetch` 加载音频），直接双击 `file://` 打开不可用。

## 🛠 技术栈

- 原生 HTML / CSS / JavaScript（零依赖）
- Web Audio API：`decodeAudioData` 解码 + `AudioBufferSourceNode` 无缝循环 + 淡入淡出/音量 `AudioParam` 缓动
- `prefers-reduced-motion` 无障碍适配

## 🎵 音源与授权

6 个音频均来自 [Mixkit Free Sound Effects](https://mixkit.co/free-sound-effects/)，适用 [Mixkit License](https://mixkit.co/license/#sfxFree)（免费使用、可商用、无需署名）。
壁炉由燃烧底噪与清脆噼啪层叠加，并与咖啡馆素材一样经 ffmpeg 交叉淡化拼为无缝长循环（壁炉 50s / 咖啡馆 134s），避免短样本循环接缝。

## 📁 结构

```
soundscape/
├── index.html           # 页面结构
├── css/style.css        # 沉浸式暗色样式
├── js/sounds.js         # 声音引擎（WAV 加载/解码/无缝循环）
├── js/app.js            # 应用逻辑（状态/播放/定时）
├── assets/sounds/       # 6 个无损 WAV 音源
└── favicon.svg
```

## 📄 License

[MIT](LICENSE)