import { InventoryCategory, InventorySubcategory, CategoryConfig, SubcategoryConfig } from '../models/Types';

// MARK: - Category Configurations
export const CATEGORY_CONFIG: Record<InventoryCategory, CategoryConfig> = {
  [InventoryCategory.FRIDGE]: {
    icon: 'fridge',
    color: '#007AFF',
    subcategories: [
      InventorySubcategory.DOOR_BOTTLES,
      InventorySubcategory.TRAY,
      InventorySubcategory.MAIN,
      InventorySubcategory.VEGETABLE,
      InventorySubcategory.FREEZER,
      InventorySubcategory.MINI_COOLER,
    ],
  },
  [InventoryCategory.GROCERY]: {
    icon: 'basket',
    color: '#34C759',
    subcategories: [
      InventorySubcategory.RICE,
      InventorySubcategory.PULSES,
      InventorySubcategory.CEREALS,
      InventorySubcategory.CONDIMENTS,
      InventorySubcategory.OILS,
    ],
  },
  [InventoryCategory.HYGIENE]: {
    icon: 'water',
    color: '#32D74B',
    subcategories: [
      InventorySubcategory.WASHING,
      InventorySubcategory.DISHWASHING,
      InventorySubcategory.TOILET_CLEANING,
      InventorySubcategory.KIDS,
      InventorySubcategory.GENERAL_CLEANING,
    ],
  },
  [InventoryCategory.PERSONAL_CARE]: {
    icon: 'account-heart',
    color: '#FF2D92',
    subcategories: [
      InventorySubcategory.FACE,
      InventorySubcategory.BODY,
      InventorySubcategory.HEAD,
    ],
  },
};

// MARK: - Subcategory Configurations
export const SUBCATEGORY_CONFIG: Record<InventorySubcategory, SubcategoryConfig> = {
  // Fridge subcategories
  [InventorySubcategory.DOOR_BOTTLES]: {
    icon: 'bottle-wine-outline',
    color: '#007AFF',
    category: InventoryCategory.FRIDGE,
    sampleItems: ['Water Bottles', 'Juice', 'Milk', 'Soft Drinks'],
  },
  [InventorySubcategory.TRAY]: {
    icon: 'tray',
    color: '#FF9500',
    category: InventoryCategory.FRIDGE,
    sampleItems: ['Eggs', 'Butter', 'Cheese', 'Yogurt'],
  },
  [InventorySubcategory.MAIN]: {
    icon: 'fridge',
    color: '#34C759',
    category: InventoryCategory.FRIDGE,
    sampleItems: ['Leftovers', 'Cooked Food', 'Fruits', 'Vegetables'],
  },
  [InventorySubcategory.VEGETABLE]: {
    icon: 'carrot',
    color: '#30D158',
    category: InventoryCategory.FRIDGE,
    sampleItems: ['Onions', 'Tomatoes', 'Potatoes', 'Leafy Greens'],
  },
  [InventorySubcategory.FREEZER]: {
    icon: 'snowflake',
    color: '#64D2FF',
    category: InventoryCategory.FRIDGE,
    sampleItems: ['Ice Cream', 'Frozen Vegetables', 'Meat', 'Ice Cubes'],
  },
  [InventorySubcategory.MINI_COOLER]: {
    icon: 'cube-outline',
    color: '#BF5AF2',
    category: InventoryCategory.FRIDGE,
    sampleItems: ['Cold Drinks', 'Snacks', 'Chocolates'],
  },

  // Grocery subcategories
  [InventorySubcategory.RICE]: {
    icon: 'rice',
    color: '#8E4EC6',
    category: InventoryCategory.GROCERY,
    sampleItems: ['Basmati Rice', 'Brown Rice', 'Jasmine Rice', 'Wild Rice'],
  },
  [InventorySubcategory.PULSES]: {
    icon: 'circle',
    color: '#FFD60A',
    category: InventoryCategory.GROCERY,
    sampleItems: ['Lentils', 'Chickpeas', 'Black Beans', 'Kidney Beans'],
  },
  [InventorySubcategory.CEREALS]: {
    icon: 'bowl',
    color: '#FF9500',
    category: InventoryCategory.GROCERY,
    sampleItems: ['Oats', 'Cornflakes', 'Wheat Flakes', 'Muesli'],
  },
  [InventorySubcategory.CONDIMENTS]: {
    icon: 'bottle-soda',
    color: '#FF3B30',
    category: InventoryCategory.GROCERY,
    sampleItems: ['Salt', 'Sugar', 'Spices', 'Sauces'],
  },
  [InventorySubcategory.OILS]: {
    icon: 'oil',
    color: '#FFD60A',
    category: InventoryCategory.GROCERY,
    sampleItems: ['Cooking Oil', 'Olive Oil', 'Coconut Oil', 'Ghee'],
  },

  // Hygiene subcategories
  [InventorySubcategory.WASHING]: {
    icon: 'tshirt-crew',
    color: '#007AFF',
    category: InventoryCategory.HYGIENE,
    sampleItems: ['Detergent', 'Fabric Softener', 'Stain Remover'],
  },
  [InventorySubcategory.DISHWASHING]: {
    icon: 'silverware-fork-knife',
    color: '#34C759',
    category: InventoryCategory.HYGIENE,
    sampleItems: ['Dish Soap', 'Dishwasher Tablets', 'Sponges'],
  },
  [InventorySubcategory.TOILET_CLEANING]: {
    icon: 'toilet',
    color: '#64D2FF',
    category: InventoryCategory.HYGIENE,
    sampleItems: ['Toilet Cleaner', 'Toilet Paper', 'Air Freshener'],
  },
  [InventorySubcategory.KIDS]: {
    icon: 'baby-face',
    color: '#FF2D92',
    category: InventoryCategory.HYGIENE,
    sampleItems: ['Diapers', 'Baby Wipes', 'Baby Shampoo'],
  },
  [InventorySubcategory.GENERAL_CLEANING]: {
    icon: 'spray',
    color: '#BF5AF2',
    category: InventoryCategory.HYGIENE,
    sampleItems: ['All-Purpose Cleaner', 'Floor Cleaner', 'Glass Cleaner'],
  },

  // Personal Care subcategories
  [InventorySubcategory.FACE]: {
    icon: 'face-woman',
    color: '#FF2D92',
    category: InventoryCategory.PERSONAL_CARE,
    sampleItems: ['CC Cream', 'Powder', 'Face Wash', 'Moisturizer'],
  },
  [InventorySubcategory.BODY]: {
    icon: 'human',
    color: '#30D158',
    category: InventoryCategory.PERSONAL_CARE,
    sampleItems: ['Lotion', 'Deodorant', 'Bathing Soap', 'Body Wash'],
  },
  [InventorySubcategory.HEAD]: {
    icon: 'head-outline',
    color: '#5856D6',
    category: InventoryCategory.PERSONAL_CARE,
    sampleItems: ['Shampoo', 'Conditioner', 'Hair Oil', 'Hair Gel'],
  },
};

// MARK: - Helper Functions
export const getCategoryConfig = (category: InventoryCategory): CategoryConfig => {
  return CATEGORY_CONFIG[category];
};

export const getSubcategoryConfig = (subcategory: InventorySubcategory): SubcategoryConfig => {
  return SUBCATEGORY_CONFIG[subcategory];
};

export const getSubcategoriesForCategory = (category: InventoryCategory): InventorySubcategory[] => {
  return CATEGORY_CONFIG[category].subcategories;
};

export const getCategoryForSubcategory = (subcategory: InventorySubcategory): InventoryCategory => {
  return SUBCATEGORY_CONFIG[subcategory].category;
};

export const getAllCategories = (): InventoryCategory[] => {
  return Object.values(InventoryCategory);
};

export const getAllSubcategories = (): InventorySubcategory[] => {
  return Object.values(InventorySubcategory);
};