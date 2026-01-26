import { InventoryCategory, InventorySubcategory, CategoryConfig, SubcategoryConfig, BuiltinSubcategory } from '../models/Types';

// MARK: - Category Configurations
export const CATEGORY_CONFIG: Record<InventoryCategory, CategoryConfig> = {
  [InventoryCategory.FRIDGE]: {
    icon: 'fridge',
    color: '#007AFF',
    subcategories: [
      BuiltinSubcategory.DOOR_BOTTLES,
      BuiltinSubcategory.TRAY,
      BuiltinSubcategory.MAIN,
      BuiltinSubcategory.VEGETABLE,
      BuiltinSubcategory.FREEZER,
      BuiltinSubcategory.MINI_COOLER,
    ],
  },
  [InventoryCategory.GROCERY]: {
    icon: 'basket',
    color: '#34C759',
    subcategories: [
      BuiltinSubcategory.RICE,
      BuiltinSubcategory.PULSES,
      BuiltinSubcategory.CEREALS,
      BuiltinSubcategory.CONDIMENTS,
      BuiltinSubcategory.OILS,
    ],
  },
  [InventoryCategory.HYGIENE]: {
    icon: 'water',
    color: '#32D74B',
    subcategories: [
      BuiltinSubcategory.WASHING,
      BuiltinSubcategory.DISHWASHING,
      BuiltinSubcategory.TOILET_CLEANING,
      BuiltinSubcategory.KIDS,
      BuiltinSubcategory.GENERAL_CLEANING,
    ],
  },
  [InventoryCategory.PERSONAL_CARE]: {
    icon: 'account-heart',
    color: '#FF2D92',
    subcategories: [
      BuiltinSubcategory.FACE,
      BuiltinSubcategory.BODY,
      BuiltinSubcategory.HEAD,
    ],
  },
};

// MARK: - Subcategory Configurations
export const SUBCATEGORY_CONFIG: Record<string, SubcategoryConfig> = {
  // Fridge subcategories
  [BuiltinSubcategory.DOOR_BOTTLES]: {
    icon: 'bottle-wine-outline',
    color: '#007AFF',
    category: InventoryCategory.FRIDGE,
    sampleItems: ['Water Bottles', 'Juice', 'Milk', 'Soft Drinks'],
  },
  [BuiltinSubcategory.TRAY]: {
    icon: 'tray',
    color: '#FF9500',
    category: InventoryCategory.FRIDGE,
    sampleItems: ['Eggs', 'Butter', 'Cheese', 'Yogurt'],
  },
  [BuiltinSubcategory.MAIN]: {
    icon: 'fridge',
    color: '#34C759',
    category: InventoryCategory.FRIDGE,
    sampleItems: ['Leftovers', 'Cooked Food', 'Fruits', 'Vegetables'],
  },
  [BuiltinSubcategory.VEGETABLE]: {
    icon: 'carrot',
    color: '#30D158',
    category: InventoryCategory.FRIDGE,
    sampleItems: ['Onions', 'Tomatoes', 'Potatoes', 'Leafy Greens'],
  },
  [BuiltinSubcategory.FREEZER]: {
    icon: 'snowflake',
    color: '#64D2FF',
    category: InventoryCategory.FRIDGE,
    sampleItems: ['Ice Cream', 'Frozen Vegetables', 'Meat', 'Ice Cubes'],
  },
  [BuiltinSubcategory.MINI_COOLER]: {
    icon: 'cube-outline',
    color: '#BF5AF2',
    category: InventoryCategory.FRIDGE,
    sampleItems: ['Cold Drinks', 'Snacks', 'Chocolates'],
  },

  // Grocery subcategories
  [BuiltinSubcategory.RICE]: {
    icon: 'rice',
    color: '#8E4EC6',
    category: InventoryCategory.GROCERY,
    sampleItems: ['Basmati Rice', 'Brown Rice', 'Jasmine Rice', 'Wild Rice'],
  },
  [BuiltinSubcategory.PULSES]: {
    icon: 'circle',
    color: '#FFD60A',
    category: InventoryCategory.GROCERY,
    sampleItems: ['Lentils', 'Chickpeas', 'Black Beans', 'Kidney Beans'],
  },
  [BuiltinSubcategory.CEREALS]: {
    icon: 'bowl',
    color: '#FF9500',
    category: InventoryCategory.GROCERY,
    sampleItems: ['Oats', 'Cornflakes', 'Wheat Flakes', 'Muesli'],
  },
  [BuiltinSubcategory.CONDIMENTS]: {
    icon: 'bottle-soda',
    color: '#FF3B30',
    category: InventoryCategory.GROCERY,
    sampleItems: ['Salt', 'Sugar', 'Spices', 'Sauces'],
  },
  [BuiltinSubcategory.OILS]: {
    icon: 'oil',
    color: '#FFD60A',
    category: InventoryCategory.GROCERY,
    sampleItems: ['Cooking Oil', 'Olive Oil', 'Coconut Oil', 'Ghee'],
  },

  // Hygiene subcategories
  [BuiltinSubcategory.WASHING]: {
    icon: 'tshirt-crew',
    color: '#007AFF',
    category: InventoryCategory.HYGIENE,
    sampleItems: ['Detergent', 'Fabric Softener', 'Stain Remover'],
  },
  [BuiltinSubcategory.DISHWASHING]: {
    icon: 'silverware-fork-knife',
    color: '#34C759',
    category: InventoryCategory.HYGIENE,
    sampleItems: ['Dish Soap', 'Dishwasher Tablets', 'Sponges'],
  },
  [BuiltinSubcategory.TOILET_CLEANING]: {
    icon: 'toilet',
    color: '#64D2FF',
    category: InventoryCategory.HYGIENE,
    sampleItems: ['Toilet Cleaner', 'Toilet Paper', 'Air Freshener'],
  },
  [BuiltinSubcategory.KIDS]: {
    icon: 'baby-face',
    color: '#FF2D92',
    category: InventoryCategory.HYGIENE,
    sampleItems: ['Diapers', 'Baby Wipes', 'Baby Shampoo'],
  },
  [BuiltinSubcategory.GENERAL_CLEANING]: {
    icon: 'spray',
    color: '#BF5AF2',
    category: InventoryCategory.HYGIENE,
    sampleItems: ['All-Purpose Cleaner', 'Floor Cleaner', 'Glass Cleaner'],
  },

  // Personal Care subcategories
  [BuiltinSubcategory.FACE]: {
    icon: 'face-woman',
    color: '#FF2D92',
    category: InventoryCategory.PERSONAL_CARE,
    sampleItems: ['CC Cream', 'Powder', 'Face Wash', 'Moisturizer'],
  },
  [BuiltinSubcategory.BODY]: {
    icon: 'human',
    color: '#30D158',
    category: InventoryCategory.PERSONAL_CARE,
    sampleItems: ['Lotion', 'Deodorant', 'Bathing Soap', 'Body Wash'],
  },
  [BuiltinSubcategory.HEAD]: {
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
  return Object.values(BuiltinSubcategory);
};