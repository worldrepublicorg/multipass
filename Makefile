# Multipass - Build System
#
# Device utilities and iOS build instructions.
# Android release builds: see docs/releasing.md and README.md.
#
# Usage:
#   make help          Show available targets
#   make ios-info      Show iOS build instructions
#
# Copyright (c) 2024 World Republic
# SPDX-License-Identifier: AGPL-3.0-or-later

# Configuration
ADB ?= $(shell command -v adb 2>/dev/null || printf '%s' "adb")

# Directory structure
CACHE_DIR := .cache
FIXTURES_DIR := fixtures/real

# Gradle release APK output (after local release build)
APK_PATH := android/app/build/outputs/apk/release/app-release.apk

.PHONY: help prepare apk-install apk-reset fixture-pull ios-info clean

# Default target
help:
	@printf '%s\n' \
		'Multipass Build System' \
		'==============================' \
		'' \
		'Android release builds:' \
		'  See README.md and docs/releasing.md' \
		'  Windows: node scripts/build-release-android.mjs assemble' \
		'  Linux/macOS: cd android && ./gradlew assembleRelease bundleRelease' \
		'' \
		'Device utilities (after a local release build):' \
		'  make apk-install       Install release APK on connected device' \
		'  make apk-reset         Clear app data on device' \
		'' \
		'iOS (requires macOS or GitHub Actions):' \
		'  make ios-info          Show iOS build instructions' \
		'' \
		'Development:' \
		'  make fixture-pull      Pull test fixture from device' \
		'  make clean             Remove build artifacts'

ios-info:
	@printf '%s\n' \
		'' \
		'iOS Build Instructions' \
		'======================' \
		'' \
		'Option 1: GitHub Actions (Recommended on non-macOS)' \
		'---------------------------------------------------' \
		'The repository includes a workflow that builds on macOS runners.' \
		'' \
		'Required secrets (configure in GitHub repository settings):' \
		'  IOS_DISTRIBUTION_CERTIFICATE_BASE64    Base64 .p12 certificate' \
		'  IOS_DISTRIBUTION_CERTIFICATE_PASSWORD  Certificate password' \
		'  IOS_PROVISIONING_PROFILE_BASE64        Base64 .mobileprovision' \
		'  KEYCHAIN_PASSWORD                      Temporary keychain password' \
		'  APPLE_TEAM_ID                          Apple Developer Team ID' \
		'' \
		'For TestFlight uploads, also configure:' \
		'  APP_STORE_CONNECT_API_KEY_ID           API Key ID' \
		'  APP_STORE_CONNECT_API_ISSUER_ID        Issuer ID' \
		'  APP_STORE_CONNECT_API_KEY_BASE64       Base64 .p8 key' \
		'' \
		'To trigger: Actions → iOS Build → Run workflow' \
		'' \
		'Option 2: Local macOS Build' \
		'---------------------------' \
		'Requirements: macOS, Xcode 16+' \
		'' \
		'Steps:' \
		'  1. npm install --legacy-peer-deps' \
		'  2. cd ios && pod install && cd ..' \
		'  3. open ios/Multipass.xcworkspace' \
		'  4. Configure signing in Xcode' \
		'  5. Product → Archive' \
		'' \
		'See .github/workflows/ios-build.yml for details.'

# Prepare directories
prepare:
	@mkdir -p \
		$(CACHE_DIR) \
		$(FIXTURES_DIR) \
		vendor

# Install release APK on connected device
apk-install:
	@test -f "$(APK_PATH)" || { echo "Error: $(APK_PATH) not found. Build a release APK first (see docs/releasing.md)."; exit 1; }
	"$(ADB)" install -r "$(APK_PATH)"
	"$(ADB)" shell monkey -p org.worldrepublic.multipass -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
	@echo "Installed: $(APK_PATH)"

# Clear app data on device
apk-reset:
	"$(ADB)" shell pm clear org.worldrepublic.multipass
	"$(ADB)" shell am force-stop org.worldrepublic.multipass
	@echo "App data cleared"

# Pull test fixture from device
fixture-pull: prepare
	@LATEST_DIR=$$("$(ADB)" shell ls /storage/emulated/0/Android/data/org.worldrepublic.multipass/files/fixtures 2>/dev/null | tr -d '\r' | grep -v '^$$' | sort | tail -n1); \
	if [ -z "$$LATEST_DIR" ]; then \
		echo "Error: No fixtures found on device"; \
		exit 1; \
	fi; \
	echo "Pulling fixture: $$LATEST_DIR"; \
	"$(ADB)" pull "/storage/emulated/0/Android/data/org.worldrepublic.multipass/files/fixtures/$$LATEST_DIR" "$(FIXTURES_DIR)/"; \
	ln -sfn "$$LATEST_DIR" "$(FIXTURES_DIR)/latest"; \
	echo "Fixture saved to: $(FIXTURES_DIR)/$$LATEST_DIR"

# Clean build artifacts
clean:
	rm -rf $(CACHE_DIR)
	rm -rf node_modules
	rm -rf ios/Pods
	rm -rf ios/build
	rm -rf android/app/build
	rm -rf android/.gradle
	@echo "Build artifacts cleaned"
