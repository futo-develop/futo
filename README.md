# futo（フト）
> タイムを捨てて、領地を育てる。走った道が色で育つランニングアプリ。

![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-lightgrey)
![Framework](https://img.shields.io/badge/framework-React%20Native%20%2F%20Expo-blue)
![Language](https://img.shields.io/badge/language-TypeScript-blue)

---

## 🎯 解決する課題

ランニング初心者の多くが「タイムが遅い」「目標設定が面倒」という理由で挫折している。

**futoはタイム・ペース・距離を一切表示しない。**
代わりに「走った道が色で育つ」という体験で、ランニングを生涯の習慣に変える。

---

## ✨ 主な機能

| 機能 | 説明 |
|------|------|
| 🗺️ **ヒートマップ** | 走った道が色づき、通過回数で緑→黄→オレンジ→赤に変化 |
| 🚩 **フロンティアマーカー** | まだ走っていないエリアに旗を自動配置。今日の目的地を提案 |
| 🏅 **称号システム** | 累計ラン数に応じて5種類の称号が解除される |
| 📊 **統計画面** | 総ラン数・総走行時間・総開拓マス数・称号プログレスバー |
| 🔔 **デイリーミッション通知** | 毎朝7時に「北方向に500m開拓せよ」などのミッションを通知 |
| 🎬 **3段階カスケード報酬** | 走り終わると演出が3段階で展開。ガチャを開ける感覚 |
| ⚙️ **通知設定** | 通知のオン/オフをユーザーが自由に設定可能 |

---

## 🛠 技術スタック

| カテゴリ | 技術 |
|---------|------|
| Framework | React Native (Expo) |
| Language | TypeScript |
| GPS | expo-location |
| Map | react-native-maps |
| Storage | AsyncStorage |
| Notifications | expo-notifications |
| Navigation | @react-navigation/bottom-tabs |
| IDE | Cursor AI |

---

## 🏗 システム設計

### GPS取得ロジック
- 取得頻度: 距離5m移動ごと（`distanceInterval: 5`）
- 精度: `Accuracy.Balanced`（速度とバッテリーのバランス）
- バックグラウンド動作対応

### ヒートマップ設計
- グリッド方式: 地図を30m×30mのマス目に分割
- 通過回数をグリッドIDをキーとしたオブジェクトで管理
- `useMemo`で全セッション+記録中ルートの通過回数を効率的に集計

### データ設計
```typescript
type GpsSession = {
  id: string;
  startTime: number;
  endTime: number;
  coordinates: { latitude: number; longitude: number }[];
};
```

---

## 📱 画面構成

├── オンボーディング画面（初回起動時のみ）
├── 地図画面（ホーム）
│   ├── ヒートマップ表示
│   ├── フロンティアマーカー
│   └── スタート/ストップボタン
├── 結果画面
│   ├── 3段階カスケード演出
│   ├── 経過時間・距離・開拓マス数
│   ├── 現在の称号
│   └── デイリーミッション達成判定
├── 統計画面
│   ├── 総ラン数・総走行時間・総開拓マス数
│   └── 称号プログレスバー
├── 称号画面
│   └── 5種類の称号（解除済み/ロック表示）
└── 設定画面
    └── 通知オン/オフ

---

## 🚀 セットアップ

```bash
git clone https://github.com/futo-develop/futo.git
cd futo
npm install
npx expo start
```

Expo Goアプリで表示されるQRコードをスキャンしてください。

---

## 📅 開発ロードマップ

### Phase 1: MVP（完成）
- [x] GPS取得・ヒートマップ
- [x] 称号・通知・統計
- [x] フロンティアマーカー
- [x] オンボーディング

### Phase 2: Growth（予定）
- [ ] TestFlight配布
- [ ] ユーザーフィードバック収集
- [ ] 道路スナップ（精密なヒートマップ）

### Phase 3: Future（予定）
- [ ] Apple Watch対応
- [ ] App Store公開

---

## 📊 開発状況

- 開発開始: 2025年3月
- 開発期間: 約2ヶ月
- 総コミット数: 40+
- 開発ブログ: [X (Twitter)](https://twitter.com/YOUR_HANDLE)

---

## 👤 開発者

[@YOUR_TWITTER_HANDLE](https://twitter.com/YOUR_TWITTER_HANDLE)
