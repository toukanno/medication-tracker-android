#!/usr/bin/env bash
# Source this file from the repo root before running gradle / capacitor commands.
# Usage: source scripts/env.sh

export JAVA_HOME="${JAVA_HOME:-$HOME/.local/android-toolchain/jdk-17.0.2}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/.local/android-toolchain/sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
