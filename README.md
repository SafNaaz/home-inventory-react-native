# Household Inventory - React Native App

A comprehensive household inventory management app built with React Native and Expo, featuring multi-category organization, smart shopping lists, and note-taking capabilities.

## 🚀 Features

### 📦 Multi-Category Inventory Management
- **Fridge**: Door bottles, tray items, main compartment, vegetables, freezer, mini cooler
- **Grocery**: Rice, pulses, cereals, condiments, oils
- **Hygiene**: Washing, dishwashing, toilet cleaning, kids items, general cleaning
- **Personal Care**: Face care, body care, hair care

### 🛒 Smart Shopping Workflow
- Add items directly to shopping list
- Mark items as purchased
- Automatic inventory updates
- Category-based organization

### 📝 Notes System
- Create and manage household notes
- Search functionality
- Category tags and priorities
- Date-based organization

### ⚙️ Settings & Customization
- Theme selection (Light/Dark/Auto)
- Notification preferences
- Reminder settings with time pickers
- Data management options

## 🛠 Technology Stack

- **Framework**: React Native with Expo SDK 51
- **Navigation**: React Navigation 6
- **UI Components**: React Native Paper (Material Design)
- **Icons**: Expo Vector Icons
- **Storage**: AsyncStorage
- **Date/Time**: React Native Community DateTimePicker
- **Language**: TypeScript
- **Build System**: EAS Build

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Expo CLI** (`npm install -g @expo/cli`)
- **EAS CLI** (`npm install -g eas-cli`) - Version 16.17.4 or higher
- **Git**

### For iOS Development:
- **macOS** (required for iOS builds)
- **Xcode** (latest version)
- **iOS Simulator**
- **CocoaPods** (`sudo gem install cocoapods`)

### For Android Development:
- **Android Studio**
- **Android SDK** (API level 34+)
- **Java JDK** (version 17 or 18)

## ⚡ Quick Start

### 1. Clone and Setup
```bash
# Clone the repository
git clone https://github.com/SafNaaz/home-inventory-react-native.git
cd home-inventory-react-native

# Install dependencies
npm install

# Fix any dependency issues
npx expo install --fix
```

### 2. Development Server
```bash
# Start the Expo development server
npm start
# or
npx expo start

# Options:
# - Press 'i' for iOS Simulator
# - Press 'a' for Android Emulator
# - Scan QR code with Expo Go app on your phone
```

### 3. Run on Specific Platforms
```bash
# iOS (requires macOS)
npm run ios
# or
npx expo run:ios

# Android
npm run android
# or
npx expo run:android

# Web
npm run web
# or
npx expo start --web
```

## 🏗 Building for Production

This project supports **multiple build workflows** depending on your needs. Choose the one that best fits your development style and requirements.

## 📱 **Development Workflows**

### **Managed Workflow (Expo Go)**
Best for: Quick prototyping, Expo SDK only apps

**Configuration:**
```json
// app.json - Include all native configurations
{
  "expo": {
    "plugins": [], // No expo-dev-client
    "android": { "package": "com.safnas.fridgeapp" },
    "ios": { "bundleIdentifier": "com.safnas.fridgeapp" }
  }
}

// package.json
{
  "scripts": {
    "android": "expo start --android",
    "ios": "expo start --ios"
  },
  "dependencies": {
    // No expo-dev-client
  }
}
```

**Usage:**
```bash
npm start          # Start Expo server
# Press 'a' for Android, 'i' for iOS
# Or scan QR code with Expo Go app
```

### **Development Build Workflow (Custom Native)**
Best for: Custom native modules, full React Native features

**Configuration:**
```json
// app.json - Include expo-dev-client plugin
{
  "expo": {
    "plugins": ["expo-dev-client"],
    "android": { "package": "com.safnas.fridgeapp" },
    "ios": { "bundleIdentifier": "com.safnas.fridgeapp" }
  }
}

// package.json
{
  "scripts": {
    "android": "expo run:android",
    "ios": "expo run:ios"
  },
  "dependencies": {
    "expo-dev-client": "~4.0.29"
  }
}
```

**Setup:**
```bash
# Generate native folders
npx expo prebuild

# Build and run locally
npm run android  # or npm run ios
```

## 🚀 **Local APK Building (Fast & Free)**

### **Quick Debug APK (Recommended for Testing)**
```bash
# Navigate to android folder
cd android

# Build debug APK (2-5 minutes)
.\gradlew assembleDebug

# APK location: android/app/build/outputs/apk/debug/app-debug.apk
```

### **Release APK (Production-ready)**
```bash
cd android

# Build release APK
.\gradlew assembleRelease

# APK location: android/app/build/outputs/apk/release/app-release.apk
```

### **Using Expo CLI**
```bash
# Debug build
npx expo run:android --variant debug

# Release build  
npx expo run:android --variant release
```

### **Bundle Size Optimization**
```bash
# Build with bundle analysis
cd android
.\gradlew assembleRelease --scan

# Build specific architecture (smaller APK)
.\gradlew assembleRelease -Preact.native.archFlags=arm64-v8a  (windows)

./gradlew assembleRelease -Preact.native.archFlags=arm64-v8a (linux)
```

## ☁️ **EAS Build (Cloud Building)**

This is useful for CI/CD, when you don't have the development environment setup, or for iOS builds on non-Mac machines.

### Setup EAS Build

```bash
# Login to your Expo account
npx eas login

# Configure the project (if not already configured)
npx eas build:configure
```

### Development Builds

```bash
# Build for development (includes dev tools)
npx eas build --profile development --platform ios
npx eas build --profile development --platform android

# Build for both platforms
npx eas build --profile development --platform all
```

### Preview Builds (APK Download)

```bash
# Build preview version - generates downloadable APK
npx eas build --profile preview --platform android
npx eas build --profile preview --platform ios
```

### Production Builds

```bash
# Build for production
npx eas build --profile production --platform ios
npx eas build --profile production --platform android

# Build for both platforms
npx eas build --profile production --platform all
```

### Submit to App Stores

```bash
# Submit to Apple App Store
npx eas submit --platform ios

# Submit to Google Play Store
npx eas submit --platform android
```

## 🔄 **Switching Between Workflows**

### **From Managed to Development Build**

1. **Add expo-dev-client**:
   ```bash
   npx expo install expo-dev-client
   ```

2. **Update app.json**:
   ```json
   {
     "expo": {
       "plugins": ["expo-dev-client"]
     }
   }
   ```

3. **Update package.json scripts**:
   ```json
   {
     "scripts": {
       "android": "expo run:android",
       "ios": "expo run:ios"
     }
   }
   ```

4. **Generate native folders**:
   ```bash
   npx expo prebuild
   ```

### **From Development Build to Managed**

1. **Remove expo-dev-client**:
   ```bash
   npm uninstall expo-dev-client
   ```

2. **Update app.json** (remove expo-dev-client from plugins):
   ```json
   {
     "expo": {
       "plugins": []
     }
   }
   ```

3. **Update package.json scripts**:
   ```json
   {
     "scripts": {
       "android": "expo start --android",
       "ios": "expo start --ios"
     }
   }
   ```

4. **Remove native folders** (optional):
   ```bash
   # Windows
   rmdir /s /q android ios
   
   # macOS/Linux
   rm -rf android ios
   ```

5. **Update .gitignore**:
   ```gitignore
   # For managed workflow
   # /android/
   # /ios/
   
   # For development build workflow
   /android/
   /ios/
   ```

## ⚡ **Build Comparison**

| Method | Speed | Cost | Use Case | APK Location |
|--------|-------|------|----------|--------------|
| **Local Debug** | 2-5 min | Free | Development/Testing | `android/app/build/outputs/apk/debug/` |
| **Local Release** | 3-7 min | Free | Production APK | `android/app/build/outputs/apk/release/` |
| **EAS Preview** | 10-20 min | Uses build minutes | Shareable APK | Download from expo.dev |
| **EAS Production** | 10-25 min | Uses build minutes | App Store submission | Download from expo.dev |

## 💡 **Quick Tips**

### **For Fast Development:**
- Use **Managed Workflow** with Expo Go for rapid prototyping
- Use **Local Debug Builds** for testing with custom native modules

### **For Production:**
- Use **Local Release Builds** for immediate APK generation
- Use **EAS Production Builds** for app store submissions

### **APK Sharing:**
```bash
# After local build, find your APK at:
android/app/build/outputs/apk/debug/app-debug.apk

# Install directly on device via ADB:
debug adb install android/app/build/outputs/apk/debug/app-debug.apk

release - adb install android/app/build/outputs/apk/release/app-release.apk
```

## 🔧 Local Development Setup

### iOS Setup (macOS only)

1. **Install Xcode** from the Mac App Store
2. **Install Command Line Tools**:
   ```bash
   xcode-select --install
   ```
3. **Install CocoaPods**:
   ```bash
   sudo gem install cocoapods
   ```
4. **Install iOS dependencies**:
   ```bash
   cd ios
   pod install
   cd ..
   ```

### Android Setup

1. **Install Android Studio** from [developer.android.com](https://developer.android.com/studio)
2. **Setup Android SDK** (API level 34+)
3. **Configure environment variables**:
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```
4. **Create Android Virtual Device (AVD)** in Android Studio

### Environment Setup

Create a `.env` file in the root directory (optional):
```env
EXPO_PUBLIC_API_URL=your_api_url_here
# Add other environment variables as needed
```

## 📁 Project Structure

```
src/
├── screens/           # Main app screens
│   ├── InventoryScreen.tsx     # Inventory management
│   ├── ShoppingScreen.tsx      # Shopping list
│   ├── NotesScreen.tsx         # Notes management
│   ├── SettingsScreen.tsx      # App settings
│   ├── InsightsScreen.tsx      # Analytics/insights
│   └── NotificationSettingsScreen.tsx
├── managers/          # Business logic managers
│   ├── InventoryManager.ts     # Inventory operations
│   ├── NotesManager.ts         # Notes operations
│   └── SettingsManager.ts      # Settings management
├── models/            # TypeScript type definitions
│   └── Types.ts
├── constants/         # App configuration
│   └── CategoryConfig.ts
├── services/          # Storage and external services
│   └── StorageService.ts
└── themes/            # App theming
    └── AppTheme.ts

# Configuration files
├── app.json           # Expo configuration
├── eas.json           # EAS Build configuration
├── babel.config.js    # Babel configuration
├── metro.config.js    # Metro bundler configuration
├── tsconfig.json      # TypeScript configuration
└── package.json       # Dependencies and scripts
```

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run TypeScript type checking
npx tsc --noEmit

# Lint code
npx eslint . --ext .ts,.tsx
```

## 📱 Key Features Implementation

### Inventory Management
- Category-based organization with visual icons
- Add/edit/delete items with quantities
- Subcategory support for detailed organization
- Quick actions for common operations

### Shopping List Workflow
- Smart workflow from inventory to purchase
- Category grouping for efficient shopping
- Purchase confirmation with automatic inventory updates
- Visual indicators for shopping status

### Notes System
- Rich text note creation and editing
- Search and filter capabilities
- Category tagging system
- Priority levels and date tracking

### Settings & Preferences
- Theme customization (Light/Dark/System)
- Notification preferences
- Reminder time configuration
- Data export/import options
- App reset functionality

## 🔄 Updates and Maintenance

### Update Expo SDK
```bash
npx expo install --fix
npm update
```

### Update EAS CLI
```bash
npm install -g eas-cli@latest
```

### Clean Build Cache
```bash
# Clear Expo cache
npx expo start --clear

# Clear npm cache
npm cache clean --force

# Clear Metro cache
npx react-native start --reset-cache
```

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler issues**:
   ```bash
   npx expo start --clear
   ```

2. **iOS build issues**:
   ```bash
   cd ios
   pod deintegrate
   pod install
   cd ..
   ```

3. **Android build issues**:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

4. **Dependency issues**:
   ```bash
   rm -rf node_modules
   npm install
   npx expo install --fix
   ```

### Build Troubleshooting

#### **EAS Build Issues**
- Check [EAS Build logs](https://expo.dev/builds) for detailed error information
- Ensure all dependencies are compatible with Expo SDK 51
- Verify that your app targets Android API level 34+ for Google Play Store

#### **Local Build Issues**

**Gradle Build Failures:**
```bash
# Clean gradle cache
cd android
.\gradlew clean

# Reset gradle wrapper
.\gradlew wrapper --gradle-version=8.8
```

**Android SDK Issues:**
```bash
# Check SDK path
echo $ANDROID_HOME  # macOS/Linux
echo %ANDROID_HOME% # Windows

# Install required SDK
# Open Android Studio > SDK Manager > Install API 34+
```

**Prebuild Issues:**
```bash
# Clear prebuild cache
npx expo prebuild --clear

# Reset to clean state
git clean -fd
npx expo prebuild
```

**Development Client Not Found:**
```bash
# Make sure you're running the right command for your workflow
# Managed: npm start (then press 'a')
# Dev Build: npm run android (builds and installs)
```

**Permission Denied (Windows):**
```cmd
# Run as administrator or use:
PowerShell -ExecutionPolicy Bypass
```

**Metro Bundler Issues:**
```bash
# Reset Metro cache
npx expo start --clear
npx react-native start --reset-cache
```

**APK Not Found After Build:**
```bash
# Check these locations:
# Debug: android/app/build/outputs/apk/debug/app-debug.apk
# Release: android/app/build/outputs/apk/release/app-release.apk

# If not found, check gradle output for actual path
cd android
.\gradlew assembleDebug --info
```

## 📄 Scripts

```bash
npm start          # Start Expo development server
npm run android    # Run on Android
npm run ios        # Run on iOS (macOS only)
npm run web        # Run on web
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙋 Support

- **Issues**: Create an issue in this repository
- **Expo Documentation**: [docs.expo.dev](https://docs.expo.dev)
- **React Native Documentation**: [reactnative.dev](https://reactnative.dev)

## 🚀 Deployment Status

- **Android**: Targets API level 34+ (Google Play Store compliant)
- **iOS**: Compatible with latest iOS versions
- **EAS Build**: Configured for development, preview, and production builds

## Version Management & Release

### Updating App Version

Before generating a new production build, update the version information:

1. **Android Version (Required for Play Store uploads)**:
   - Edit `android/app/build.gradle`
   - Increment `versionCode` (integer) for each release
   - Update `versionName` (string) for user-facing version

2. **Package Version (Optional)**:
   - Update `version` in `package.json`

### Build Commands

```bash
# Clean previous builds
cd android
./gradlew clean

# Generate signed AAB for Play Store (recommended)
./gradlew bundleRelease

# Generate signed APK
./gradlew assembleRelease
```

### Build Artifacts

Generated files will be located in:
- **AAB**: `android/app/build/outputs/bundle/release/`
- **APK**: `android/app/build/outputs/apk/release/`

### Data Persistence

User data will persist across app updates when:
- Package name (applicationId) remains unchanged
- App is signed with the same keystore
- Internal storage structure is maintained

### Git Ignore

The following build artifacts are excluded from version control:
- Build directories (`build/`)
- Gradle cache (`.gradle/`)
- IDE files (`.idea/`, `*.iml`)
- Bundle files (`*.jsbundle`)
- Native build cache