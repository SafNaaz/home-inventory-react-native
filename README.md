# Household Inventory - React Native App

A comprehensive household inventory management app built with React Native and Expo, featuring multi-category organization, smart shopping lists, and note-taking capabilities.

## Features

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

## Technology Stack

- **Framework**: React Native with Expo
- **Navigation**: React Navigation 6
- **UI Components**: React Native Paper (Material Design)
- **Icons**: Expo Vector Icons
- **Storage**: AsyncStorage
- **Date/Time**: React Native Community DateTimePicker
- **Language**: TypeScript

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development) or Android Studio (for Android)

### Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd "react native"
   ```

2. **Run the setup script**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on your preferred platform**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app on your phone

### Manual Installation

If you prefer to install manually:

```bash
# Install Expo CLI globally
npm install -g @expo/cli

# Install dependencies
npm install

# Start the app
npm start
```

## Project Structure

```
src/
├── screens/           # Main app screens
│   ├── InventoryScreen.tsx
│   ├── ShoppingScreen.tsx
│   ├── NotesScreen.tsx
│   └── SettingsScreen.tsx
├── managers/          # Business logic managers
│   ├── InventoryManager.ts
│   ├── NotesManager.ts
│   └── SettingsManager.ts
├── models/            # TypeScript type definitions
│   └── Types.ts
├── constants/         # App configuration
│   └── CategoryConfig.ts
├── services/          # Storage and external services
│   └── StorageService.ts
└── themes/            # App theming
    └── AppTheme.ts
```

## Key Components

### Inventory Management
- Category-based organization with visual icons
- Add/edit/delete items with quantities
- Subcategory support for detailed organization
- Quick actions for common operations

### Shopping List
- Smart workflow from inventory to purchase
- Category grouping for efficient shopping
- Purchase confirmation with automatic inventory updates
- Visual indicators for shopping status

### Notes System
- Rich text note creation and editing
- Search and filter capabilities
- Category tagging system
- Priority levels and date tracking

### Settings
- Theme customization (Light/Dark/System)
- Notification preferences
- Reminder time configuration
- Data export/import options
- App reset functionality

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
# For iOS
npm run ios

# For Android
npm run android

# For Web
npm run web
```

### Code Style
The project uses TypeScript with strict type checking. Key conventions:
- Use functional components with hooks
- Follow React Native Paper design guidelines
- Implement proper error handling
- Use TypeScript interfaces for all data models

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please create an issue in the repository.