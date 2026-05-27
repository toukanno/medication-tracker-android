# medication-tracker-android

`toukanno/medication-tracker-web` の Android 版。Capacitor で既存の Vite 製 web アプリを WebView ラップし、ネイティブ APK / AAB として配布できる構成にしてあります。

GitHub: <https://github.com/toukanno/medication-tracker-android>

## 構成

```
medication-tracker-android/
├── src/                              # web アプリ (Vite + vanilla JS)
│   ├── main.js                       # エントリ + SplashScreen.hide / 通知再スケジュール
│   ├── notifications.js              # @capacitor/local-notifications ラッパー
│   ├── store.js / style.css
│   └── views/                        # today / meds / history / settings
├── assets/                           # @capacitor/assets の入力 (icon / splash SVG)
├── public/                           # PWA assets, icon
├── index.html, vite.config.js
├── capacitor.config.json             # appId: com.toukanno.medicationtracker
├── android/                          # Capacitor が生成した Android プロジェクト
│   ├── app/build.gradle              # release 用 signingConfig 雛形入り
│   └── keystore.properties.example   # release keystore 設定の見本
├── scripts/env.sh                    # JDK / Android SDK 用の環境変数
├── medication-tracker-debug.apk      # ビルド済みデバッグ APK (署名: Android Debug)
├── medication-tracker-release-unsigned.aab  # 未署名 release AAB
└── package.json
```

## 採用方式: Capacitor

| 候補 | 採否 | 理由 |
| ---- | ---- | ---- |
| **Capacitor 6.x** | ✅ | 既存 Vite + vanilla JS をそのまま WebView でラップ。プラグインで通知等のネイティブ機能も追加可 |
| React Native | ✗ | UI 全書き換えが必要 |
| 単純な PWA (TWA) | ✗ | APK 単体配布が要件のため Capacitor を選択 |

## 機能まとめ

- 服薬の登録 / 編集 / 削除 / 服用記録 / 履歴チャート (7日間棒グラフ)
- データの JSON エクスポート / インポート
- **テーマカラー 10 色**: blue / green / pink / purple / orange / red / teal / indigo / amber / slate
- **アプリアイコン**: `@capacitor/assets` で `assets/icon-only.svg` から adaptive icon 含めて自動生成
- **スプラッシュスクリーン**: `@capacitor/splash-screen` (背景 `#2563eb`, アプリ初回描画後にフェードアウト)
- **ローカル通知**: `@capacitor/local-notifications` で服用時刻に毎日リマインダー (権限確認 + 自動再スケジュール)

## ビルド方法

### 必要なもの

- Node.js 20+
- OpenJDK 17
- Android SDK (cmdline-tools, platform-tools, platforms;android-34, build-tools;34.0.0)

`scripts/env.sh` をローカルにインストールしたツールチェーンに合わせて編集します。

### Android SDK / JDK の準備 (root 権限なしの例)

```bash
mkdir -p ~/.local/android-toolchain && cd $_

# JDK 17 (portable)
curl -fsSL -o jdk17.tar.gz \
  https://download.java.net/java/GA/jdk17.0.2/dfd4a8d0985749f896bed50d7138ee7f/8/GPL/openjdk-17.0.2_linux-x64_bin.tar.gz
tar -xzf jdk17.tar.gz

# Android command-line tools
curl -fsSL -o cmdtools.zip \
  https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
mkdir -p sdk/cmdline-tools && unzip -q cmdtools.zip -d tmp && \
  mv tmp/cmdline-tools sdk/cmdline-tools/latest && rmdir tmp

export JAVA_HOME=$PWD/jdk-17.0.2
export ANDROID_HOME=$PWD/sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH

yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```

### npm scripts

```bash
source scripts/env.sh
npm install

npm run android:build:debug      # → debug APK (Android Debug 署名)
npm run android:build:release    # → release APK (keystore 未設定なら未署名)
npm run android:bundle:release   # → release AAB (Play Store 配布用)
npm run assets:generate          # → アイコン / スプラッシュ再生成
npm run dev                      # → Vite dev server (ブラウザ確認用)
```

### release 署名鍵の生成

`@capacitor/assets` でアイコンを更新したり、`release` ビルドを公開用に署名する場合は以下を実行:

```bash
# 1. keystore を作成 (パスワードと dname を聞かれる)
source scripts/env.sh
keytool -genkey -v \
  -keystore android/release.keystore \
  -alias medication-tracker \
  -keyalg RSA -keysize 2048 -validity 10000

# 2. 設定ファイルを置く (gitignored)
cp android/keystore.properties.example android/keystore.properties
# → android/keystore.properties を編集して storePassword / keyPassword を入れる

# 3. 署名付き release を作る
npm run android:bundle:release   # 署名済み AAB
npm run android:build:release    # 署名済み APK
```

`android/app/build.gradle` の `signingConfigs.release` がこの `keystore.properties` を読みに行く構成になっています (ファイルが無ければ未署名でビルドが進む)。

## Android 端末へのインストール手順

### A. adb 経由 (USB / Wi-Fi デバッグ) — 推奨

1. 端末で「設定 → 端末情報 → ビルド番号」を 7 回タップして開発者になる
2. 「設定 → 開発者オプション → USB デバッグ」を ON
3. PC と USB 接続して、端末側のダイアログで認証
4. `adb devices` で `device` 状態になっていることを確認
5. `adb install -r medication-tracker-debug.apk`
6. 端末ホームに「お薬トラッカー」アイコンが追加され、起動可能

### B. APK ファイルを端末に直接転送

1. `medication-tracker-debug.apk` を Google ドライブ / Slack / メール添付 / USB 経由で端末へ
2. 端末で「設定 → アプリ → 特別なアプリアクセス → 提供元不明のアプリ」でファイラ等にインストール許可
3. ファイラから APK をタップ → 「インストール」
4. 起動

### 通知の有効化

1. アプリを起動し「設定」タブを開く
2. 「通知をオンにする」をタップ
3. システムから通知権限を求められたら許可 (Android 13+)
4. 「薬」タブから服用時刻を登録 → 毎日その時刻にリマインダーが発火

## ビルド済み成果物

| ファイル | サイズ | 用途 | 署名 |
| -------- | ---- | ---- | ---- |
| `medication-tracker-debug.apk` | 4.5 MB | 端末への sideload / 動作確認 | Android Debug 証明書 |
| `medication-tracker-release-unsigned.aab` | 3.1 MB | Play Store 配布用 (要署名) | **未署名** |

検証:
- `aapt dump badging` で package / icon / 権限を確認済み
- `apksigner verify` で debug APK は Android Debug 証明書での署名を確認済み
- minSdk=22 (Android 5.1) / targetSdk=34 (Android 14)

APK 内パーミッション:
- `INTERNET` (Capacitor 既定)
- `POST_NOTIFICATIONS` (Android 13+ ローカル通知)
- `RECEIVE_BOOT_COMPLETED` (端末再起動後にリマインダーを再登録)
- `WAKE_LOCK` (通知配信時)

## 残課題 / TODO

- **実機での起動・通知挙動の検証**: 本リポジトリの CI 環境には Android デバイスが繋がっておらず、`adb install` と「実機で通知が鳴る」までは未確認。手元の端末でご確認ください。
- **release 用 keystore**: 上記手順で各自生成してください。生成すると `signingConfigs.release` が自動有効化されます。
- **Play Console 連携**: AAB のアップロード / 内部テスト用トラックの設定は未対応。
- **アイコンの微調整**: 現状は SVG を自動展開したものなので、デザイナー入稿の PNG (1024×1024) に差し替えると Play 配布品質になります。
- **服用時刻の通知再スケジュール**: ローカル通知は毎日繰り返しに登録していますが、`Capacitor.App.appStateChange` で foreground 戻り時にも reschedule する余地あり。
- **通知タップ → 服用記録**: 現在は通知を出すのみ。タップで `markTaken` を呼び出すリンク連携は今後の拡張ポイント。
