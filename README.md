# futo（フト）

> 走った道が「育つ」ランニングアプリ

## コンセプト
タイム・ペース・距離を一切表示せず、
「走った道が色で育つ」という新しい体験を提供するランニングアプリ。

数字で自分を評価せず、地図を育てる楽しさでランニングを習慣化。

## 実装済み機能
- ✅ GPS取得とバックグラウンド動作
- ✅ 走行ルートの記録と保存
- ✅ 地図上へのヒートマップ表示
- ✅ 通過回数に応じた色分け
  - 🟢 1回: 緑
  - 🟡 2-4回: 黄色
  - 🟠 5-9回: オレンジ
  - 🔴 10回以上: 赤
- ✅ データ永続化（AsyncStorage）

## 技術スタック
- React Native (Expo)
- TypeScript
- expo-location
- react-native-maps
- AsyncStorage

## セットアップ
```bash
git clone https://github.com/futo-develop/futo.git
cd futo
npm install
npm start
```

## 開発状況
- 開発期間: 1週間（進行中）
- 総コミット数: 15+
