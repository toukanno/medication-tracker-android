# medication-tracker-android

`toukanno/medication-tracker-web` の Android 版。Capacitor で既存の Vite 製 web アプリを WebView ラップし、ネイティブ APK として配布できる構成にしてあります。

## 構成

```
medication-tracker-android/
├── src/                  # web アプリ (medication-tracker-web から移植)
├── public/               # PWA assets, icon
├── index.html
├── vite.config.js
├── capacitor.config.json # appId: com.toukanno.medicationtracker
├── android/              # Capacitor が生成した Android プロジェクト (Gradle)
├── scripts/env.sh        # JDK / Android SDK 用の環境変数
├── medication-tracker-debug.apk  # ビルド済みデバッグ APK
└── package.json
```

## 採用方式: Capacitor

| 候補 | 採否 | 理由 |
| ---- | ---- | ---- |
| **Capacitor** | ✅ | 既存 Vite + vanilla JS をそのまま WebView でラップでき、書き換え不要。Android 配布だけ追加すれば良い |
| React Native | ✗ | UI 全書き換えが必要 |
| 単純な PWA (TWA) | ✗ | ストア配布や端末 sideload が前提のため、APK 自体を生成できる Capacitor を選択 |

## 追加したテーマカラー

既存の 5 色 (blue / green / pink / purple / orange) に加えて **5 色** 追加:

- red (#ef4444)
- teal (#14b8a6)
- indigo (#6366f1)
- amber (#f59e0b)
- slate (#475569)

CSS 変数 (`src/style.css`) と設定画面のテーマリスト (`src/views/settings.js`) の両方を更新。

## ビルド方法

### 必要なもの

- Node.js 20+
- OpenJDK 17
- Android SDK (cmdline-tools, platform-tools, platforms;android-34, build-tools;34.0.0)

サンドボックス環境では `scripts/env.sh` がローカルにインストールしたツールチェーンの場所を `JAVA_HOME` / `ANDROID_HOME` に設定します。各自の環境に合わせて編集してください。

### Android SDK / JDK の準備 (root 権限なしの例)

```bash
# JDK 17 (portable)
mkdir -p ~/.local/android-toolchain && cd $_
curl -fsSL -o jdk17.tar.gz \
  https://download.java.net/java/GA/jdk17.0.2/dfd4a8d0985749f896bed50d7138ee7f/8/GPL/openjdk-17.0.2_linux-x64_bin.tar.gz
tar -xzf jdk17.tar.gz

# Android command-line tools
curl -fsSL -o cmdtools.zip \
  https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
mkdir -p sdk/cmdline-tools
unzip -q cmdtools.zip -d tmp && mv tmp/cmdline-tools sdk/cmdline-tools/latest && rmdir tmp

export JAVA_HOME=$PWD/jdk-17.0.2
export ANDROID_HOME=$PWD/sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH

yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```

### APK の作成 (debug)

```bash
cd medication-tracker-android
source scripts/env.sh
npm install
npx vite build                # dist/ を生成
npx cap sync android          # dist → android/app/src/main/assets/public
cd android && ./gradlew assembleDebug
# 出力: android/app/build/outputs/apk/debug/app-debug.apk
```

ワンライナーなら `npm run android:build:debug`。

### release ビルド

`android/app` に署名鍵を配置し、`build.gradle` で `signingConfigs` を設定したうえで `./gradlew assembleRelease`。

## Android 端末へのインストール手順

### A. adb 経由 (USB / Wi-Fi)

1. 端末で 開発者オプション → USB デバッグ を有効化
2. PC と接続し `adb devices` で認識を確認
3. 以下を実行
   ```bash
   adb install -r medication-tracker-debug.apk
   ```

### B. APK を直接転送

1. `medication-tracker-debug.apk` を Google ドライブ / メール / USB 転送 で端末へコピー
2. 端末側で「提供元不明のアプリ」のインストールを許可
3. ファイラから APK をタップしてインストール

インストール後、ホーム画面の **「お薬トラッカー」** アイコンから起動できます。

## APK の確認結果

ビルドが完了したデバッグ APK は次の通り:

| 項目 | 値 |
| ---- | --- |
| ファイル | `medication-tracker-debug.apk` |
| サイズ | 約 3.6 MB |
| package | `com.toukanno.medicationtracker` |
| versionCode / versionName | 1 / 1.0 |
| minSdk | 22 (Android 5.1) |
| targetSdk | 34 (Android 14) |
| 署名 | Android Debug certificate (SHA-256: c718...2633) |

`aapt dump badging` / `apksigner verify` / `apkanalyzer apk summary` で検証済み。

## 残課題

- **実機での起動確認は未実施**: 本リポジトリのビルド環境 (WSL2 Linux) には USB Android デバイスが接続されておらず `adb install` を試せていません。debug APK 自体は標準的な構成で生成・署名済みのため、ユーザの手元の端末でインストール検証してください。
- **アプリアイコン**: 現在は Capacitor のデフォルトアイコン。`android/app/src/main/res/mipmap-*` を入れ替えるか、`@capacitor/assets` で `icon.svg` から生成すると本物のアイコンになります。
- **release 署名鍵**: 用意していません。Play Store 公開や正式配布時には keystore を生成し、`android/app/build.gradle` の `signingConfigs.release` を設定する必要があります。
- **通知 / リマインダー**: 服用時刻のローカル通知 (`@capacitor/local-notifications`) は未導入。ネイティブ機能としては今後の拡張余地です。
- **Splash screen**: 現在は Capacitor デフォルト。`@capacitor/splash-screen` プラグインで調整可能。
- **ストア配布**: Play Console での AAB 化と内部テスト構成は未対応。
