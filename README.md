# 🎆 Firework Factory

A comprehensive Vue.js web application for managing firework store inventory, orders, products, categories, and vendors.

## Features

- **📦 Product Management** - Add, edit, and organize firework products with detailed specifications and hierarchical unit configuration
- **📊 Inventory Tracking** - Real-time stock monitoring with low stock alerts and proper quantity management
- **🛒 Order Processing** - Manage customer orders and order lifecycle with integrated inventory updates
- **🏷️ Category Organization** - Organize products into logical categories
- **🏢 Vendor Management** - Maintain supplier relationships and contact information
- **🚨 Smart Alerts** - Automated notifications for low stock and critical updates
- **📄 Pagination** - Smart pagination system for all major views (10 items per page)
- **📱 Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices

## Technology Stack

- **Frontend**: Vue.js 3.x with Composition API
- **State Management**: Pinia
- **Routing**: Vue Router 4
- **Build Tool**: Vue CLI 5 with Webpack
- **Styling**: Modern CSS3 with responsive design
- **Code Quality**: ESLint for code linting

## Project Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd firework-factory

# Install dependencies
npm install
```

### Development

```bash
# Start development server with hot-reload
npm run serve
```

The application will be available at `http://localhost:8080`

### Build for Production

```bash
# Build optimized version for production
npm run build
```

### Code Quality

```bash
# Run ESLint to check code quality
npm run lint

# Auto-fix linting issues
npm run lint --fix
```

## Application Structure

```
src/
├── components/         # Reusable Vue components
│   ├── PagePagination.vue  # Reusable pagination component
│   └── Toast.vue          # Toast notification system
├── views/              # Page-level components
│   ├── HomeView.vue            # Dashboard and overview
│   ├── ProductsView.vue        # Product management
│   ├── InventoryView.vue       # Stock tracking
│   ├── OrdersView.vue          # Order processing
│   ├── CategoriesView.vue      # Category management
│   └── VendorsView.vue         # Vendor management
├── router/             # Vue Router configuration
│   └── index.js        # Route definitions
├── stores/             # Pinia state management
│   └── inventory.js    # Main application store
├── firebase/           # Firebase integration
│   ├── config.js       # Firebase configuration
│   └── firebaseService.js # Firebase service methods
├── assets/             # Static assets
├── styles/             # Global CSS styles
└── main.js            # Application entry point
```

## Key Features Explained

### Product Management
- Add new firework products with detailed specifications
- Categorize products by type (Sparklers, Roman Candles, Fountains, etc.)
- Track pricing, costs, weights, and safety classifications
- Manage vendor relationships

### Inventory Tracking
- Real-time stock level monitoring with Firebase integration
- Location-based inventory management
- Low stock alerts and notifications
- Stock adjustment capabilities
- Proper handling of numeric quantities to prevent calculation errors
- Support for hierarchical unit management
- Inventory updates when orders are received

### Order Processing
- Customer order creation and management
- Order status tracking
- Revenue analytics
- Order history and reporting

### Safety & Compliance
- Safety class tracking (Class A, B, C)
- Regulatory compliance features
- Product specification management

## Sample Data

The application comes pre-loaded with sample data including:
- 5 product categories (Sparklers, Roman Candles, Fountains, Rockets, Cakes)
- 2 sample vendors with contact information
- 3 sample products with inventory
- 1 sample customer order

## Development Guidelines

### Code Style
- Use Vue 3 Composition API
- Follow ESLint configuration
- Use semantic HTML elements
- Implement responsive design principles
- Add proper error handling and validation

### Component Organization
- Keep components focused and reusable
- Use proper Vue naming conventions
- Implement proper prop validation
- Add JSDoc comments for complex functions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions, issues, or feature requests, please open an issue in the repository or contact the development team.

---

**Built with ❤️ for the fireworks industry**
