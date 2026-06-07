---
title: "深度学习自动调制分类：从零到一的科研心得"
published: 2026-05-15
updated: 2026-06-03
description: "分享我在 AMC (Automatic Modulation Classification) 方向上的研究历程，从选题、数据生成到模型设计的全流程思考。"
tags: ["深度学习", "研究", "AMC"]
category: "研究"
pinned: false
---

## 什么是 AMC？

自动调制分类（Automatic Modulation Classification）是认知无线电中的关键任务——给定一段接收到的信号，判断它使用了哪种调制方式（QPSK、16QAM、64QAM 等）。

传统方法依赖专家特征（高阶累积量、循环平稳特征），而深度学习方法可以直接从 IQ 采样数据中学习判别性特征。

## 切入点的选择

科研选题最容易陷入"炼金"陷阱——调参刷榜。我的经验是：

1. **先复现基线** — 至少复现 2-3 篇经典方法的完整 pipeline
2. **找 insight** — 不是看 SOTA 差多少，而是分析为什么差
3. **明确定位** — 你的贡献是数据、模型、训练策略，还是问题定义本身？

## 信号数据生成的坑

```python
import numpy as np

def generate_iq_samples(mod_type: str, snr_db: float, n_samples: int = 1024):
    """生成 IQ 样本 — 注意相位和定时同步"""
    # ⚠️ 常见错误：
    # 1. 没有模拟载波频率偏移 (CFO)
    # 2. 忽略了多径衰落
    # 3. 训练集和测试集的 SNR 分布一致（这是数据泄露！）

    # 正确的做法：加入非理想因素
    phase_offset = np.random.uniform(0, 2 * np.pi)       # 相位偏移
    freq_offset = np.random.uniform(-0.01, 0.01)          # 频率偏移
    timing_offset = np.random.randint(0, 4)               # 定时偏移

    # ... 信号生成逻辑
    return iq_samples
```

## 模型设计的教训

| 做法 | 结果 |
|------|------|
| 直接用 ResNet-50 | 过拟合严重，参数量过大 |
| CNN + LSTM 简单堆叠 | 训练不稳定 |
| 轻量 CNN + 多头注意力 | 在 -10dB SNR 下仍有 85%+ 准确率 |

> 大模型不一定好。信号数据的信息量远小于图像，模型容量需要匹配数据的信息复杂度。

## 论文写作

几点血泪教训：

- **Figure 1 最重要** — 审稿人可能只看摘要和 Figure 1
- **消融实验要诚实** — 即使某个模块效果不明显，也要如实报告
- **可视化要直观** — 混淆矩阵和星座图比表格更有说服力
- **结论忌自夸** — 说清楚 limitations 反而增加可信度

## 下一步

目前正在探索：
- 小样本条件下的调制识别（Few-shot AMC）
- 利用对比学习提升低 SNR 性能
- 开放集识别：识别未见过的调制类型

希望这些心得对同样在研究这条路上的同学有帮助。
