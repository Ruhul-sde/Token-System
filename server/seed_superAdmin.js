import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/token-system');
    console.log('Connected to MongoDB');

    // Clear only users to preserve other data if needed
    await User.deleteMany({});
    console.log('Cleared existing users');

    // Create Super Admin only
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    await User.create({
      email: 'ruhul@akshay.com',
      password: hashedPassword,
      name: 'Ruhul Amin',
      employeeCode: 'SA001',
      role: 'superadmin'
    });

    console.log('\n=================================');
    console.log('SuperAdmin seeded successfully!');
    console.log('=================================');
    console.log('\nSuper Admin Credentials:');
    console.log('-------------------------');
    console.log('Email: ruhul@akshay.com');
    console.log('Password: password123');
    console.log('Employee Code: SA001');
    console.log('=================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();