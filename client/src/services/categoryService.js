// Category service for POS system
export const CATEGORIES = [
  {
    _id: '699814809e8acd2ecca033cd',
    name: 'SOUPS',
    icon: '🍲',
    bgColor: '#b73e3e',
    description: 'Soups'
  }
];

export const getCategoryById = (id) => {
  if (!id) {
    return {
      _id: null,
      name: 'Uncategorized',
      icon: '📦',
      bgColor: '#95a5a6'
    };
  }
  
  const category = CATEGORIES.find(c => c._id === id);
  return category || {
    _id: id,
    name: 'Uncategorized',
    icon: '📦',
    bgColor: '#95a5a6'
  };
};

export const extractCategoriesFromMenu = (menuItems) => {
  if (!menuItems || menuItems.length === 0) {
    return [{ id: 'all', name: 'All Items', icon: '📋', count: 0, bgColor: '#4361ee' }];
  }
  
  const categoriesMap = new Map();
  
  // Add all items category
  categoriesMap.set('all', {
    id: 'all',
    name: 'All Items',
    icon: '📋',
    bgColor: '#4361ee',
    count: menuItems.length
  });
  
  // Extract categories from menu items
  menuItems.forEach(item => {
    const categoryId = item.category;
    if (categoryId) {
      const category = getCategoryById(categoryId);
      if (!categoriesMap.has(categoryId)) {
        categoriesMap.set(categoryId, {
          id: categoryId,
          name: category.name,
          icon: category.icon,
          bgColor: category.bgColor,
          count: 0
        });
      }
      categoriesMap.get(categoryId).count++;
    }
  });
  
  // Return as array, with All Items first
  return [categoriesMap.get('all'), ...Array.from(categoriesMap.values()).filter(c => c.id !== 'all')];
};
