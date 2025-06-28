# Copilot Instructions for Firework Factory

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a Vue.js web application for managing a firework store called "Firework Factory". The application is designed to track:

- **Inventory Management** - Monitor stock levels, locations, and availability
- **Orders** - Process customer orders and manage order lifecycle
- **Products** - Catalog of firework products with details, pricing, and specifications
- **Product Categories** - Organize products into logical categories (e.g., Sparklers, Roman Candles, Fountains, etc.)
- **Product Vendors** - Manage supplier relationships and vendor information

## Technical Stack
- **Frontend**: Vue.js 3.x with Vue CLI
- **Build Tool**: Webpack (via Vue CLI)
- **Styling**: CSS3 with custom component styles
- **State Management**: Pinia for centralized state management
- **Routing**: Vue Router for navigation
- **Backend**: Firebase Firestore for data storage
- **Data Caching**: LocalStorage for offline capabilities

## Code Style Guidelines
- Use Vue.js single-file components (.vue files)
- Follow Vue.js naming conventions (PascalCase for components, kebab-case for props)
- Implement responsive design principles
- Use semantic HTML elements
- Organize components in logical directory structure
- Add proper error handling and validation
- Include JSDoc comments for complex functions

## Important Implementation Details
- **Unit Configuration**: Products use a hierarchical unit system (Item → Package → Case) managed through a unitConfig object
- **Pagination**: All list views use a reusable Pagination component (10 items per page)
- **Inventory Updates**: Receiving orders adds to current inventory (uses proper numeric conversion)
- **Firebase Integration**: All data is stored in Firebase with local caching
- **Error Handling**: Conversion errors are prevented by explicit Number() conversions

## Business Logic
- Focus on inventory tracking and management workflows
- Implement proper data validation for product and order information
- Consider safety regulations and compliance for firework products
- Design with retail/wholesale operations in mind

## Development Preferences
- Prioritize clean, maintainable code
- Use modern JavaScript (ES6+) features
- Implement component reusability
- Add proper loading states and user feedback
- Design mobile-first responsive interfaces
