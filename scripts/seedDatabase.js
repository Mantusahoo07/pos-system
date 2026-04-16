import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../server/models/User.js';
import MenuItem from '../server/models/MenuItem.js';
import dotenv from 'dotenv';

dotenv.config();

const sampleMenuItems = [
  { name: 'Margherita Pizza', price: 12.99, category: 'Pizza', prepTime: 15, available: true, isPopular: true },
  { name: 'Pepperoni Pizza', price: 14.99, category: 'Pizza', prepTime: 15, available: true, isPopular: true },
  { name: 'Caesar Salad', price: 8.99, category: 'Salad', prepTime: 5, available: true },
  { name: 'Chicken Wings', price: 10.99, category: 'Appetizer', prepTime: 10, available: true, isPopular: true },
  { name: 'French Fries', price: 4.99, category: 'Sides', prepTime: 5, available: true },
  { name: 'Cheeseburger', price: 11.99, category: 'Burger', prepTime: 12, available: true, isPopular: true },
  { name: 'Coca Cola', price: 2.49, category: 'Beverage', prepTime: 1, available: true },
  { name: 'Ice Cream', price: 5.99, category: 'Dessert', prepTime: 2, available: true }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pos-system');
    
    // Clear existing data
    await User.deleteMany({});
    await MenuItem.deleteMany({});
    
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      username: 'admin',
      email: 'admin@restaurant.com',
      password: adminPassword,
      role: 'admin',
      permissions: {
        canEditMenu: true,
        canManageUsers: true,
        canViewReports: true,
        canRefundOrders: true,
        canMarkOutOfStock: true
      },
      active: true
    });
    
    // Create sample menu items
    await MenuItem.insertMany(sampleMenuItems);
    
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();