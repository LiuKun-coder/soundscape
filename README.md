# 声屿 Soundscape 🌊

> 把世界调成喜欢的声音 —— 极简白噪声小应用。

一个纯前端、零依赖、无外部音频资源的白噪声应用。所有声音都由 **Web Audio API 实时合成**，即开即听。

![cover](https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=dark%20immersive%20ambient%20app%20interface%20with%20rain%20sound%20waves%20and%20a%20glowing%20circular%20dial%2C%20soft%20blue%20tones&image_size=landscape_16_9)

## ✨ 功能

- **6 种合成音源**：雨声、海浪、壁炉、咖啡馆、深夜林、风扇（全部实时生成，无音频文件）
- **多声音混合**：同时叠加多种声音，每种独立调节音量
- **沉浸式视觉**：氛围色随声音联动，中央圆盘呼吸波纹动画
- **定时关闭**：15 / 30 / 60 分钟，到时声音缓缓淡出
- **移动端优先**：手机壳式布局，桌面端居中显示

## 🚀 运行

无需构建，直接打开 `index.html`，或启动任意静态服务器：

```bash
python3 -m http.server 8000
# 访问 http://localhost:8000
```

## 🛠 技术栈

- 原生 HTML / CSS / JavaScript（零依赖）
- Web Audio API：白噪声 / Pink 噪声合成、BiquadFilter、LFO 调制、AudioParam 缓动
- `prefers-reduced-motion` 无障碍适配

## 📁 结构

```
soundscape/
├── index.html       # 页面结构
├── css/style.css    # 沉浸式暗色样式
├── js/sounds.js     # 声音引擎（合成算法）
├── js/app.js        # 应用逻辑（状态/播放/定时）
└── favicon.svg
```

## 📄 License

[MIT](LICENSE)