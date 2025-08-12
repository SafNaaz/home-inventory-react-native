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

This project uses **EAS Build** for creating production builds. Make sure you have an Expo account and are logged in.

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

### Preview Builds

```bash
# Build preview version (production-like but for testing)
npx eas build --profile preview --platform ios
npx eas build --profile preview --platform android
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

- Check [EAS Build logs](https://expo.dev/builds) for detailed error information
- Ensure all dependencies are compatible with Expo SDK 51
- Verify that your app targets Android API level 34+ for Google Play Store

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