
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import Token from './models/Token.js';
import Department from './models/Department.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/token-system');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Token.deleteMany({});
    await Department.deleteMany({});
    console.log('Cleared existing data');

    // Create Departments
    const departments = await Department.insertMany([
      { name: 'IT Support', description: 'Information Technology Support' },
      { name: 'Human Resources', description: 'HR Department' },
      { name: 'Finance', description: 'Finance and Accounting' },
      { name: 'Operations', description: 'Operations Management' },
      { name: 'Marketing', description: 'Marketing and Communications' },
      { name: 'Customer Service', description: 'Customer Support' }
    ]);
    console.log('Created departments');

    // Create Users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = await User.insertMany([
      // Regular Users
      {
        email: 'john.doe@akshay.com',
        password: hashedPassword,
        name: 'John Doe',
        employeeCode: 'EMP001',
        role: 'user'
      },
      {
        email: 'alice.johnson@akshay.com',
        password: hashedPassword,
        name: 'Alice Johnson',
        employeeCode: 'EMP002',
        role: 'user'
      },
      {
        email: 'bob.wilson@akshay.com',
        password: hashedPassword,
        name: 'Bob Wilson',
        employeeCode: 'EMP003',
        role: 'user'
      },
      {
        email: 'sarah.miller@akshay.com',
        password: hashedPassword,
        name: 'Sarah Miller',
        employeeCode: 'EMP004',
        role: 'user'
      },
      {
        email: 'mike.brown@akshay.com',
        password: hashedPassword,
        name: 'Mike Brown',
        employeeCode: 'EMP005',
        role: 'user'
      },
      
      // Admins
      {
        email: 'admin.it@akshay.com',
        password: hashedPassword,
        name: 'IT Admin',
        employeeCode: 'ADM001',
        role: 'admin',
        department: departments[0]._id
      },
      {
        email: 'admin.hr@akshay.com',
        password: hashedPassword,
        name: 'HR Admin',
        employeeCode: 'ADM002',
        role: 'admin',
        department: departments[1]._id
      },
      {
        email: 'admin.finance@akshay.com',
        password: hashedPassword,
        name: 'Finance Admin',
        employeeCode: 'ADM003',
        role: 'admin',
        department: departments[2]._id
      },
      {
        email: 'admin.ops@akshay.com',
        password: hashedPassword,
        name: 'Operations Admin',
        employeeCode: 'ADM004',
        role: 'admin',
        department: departments[3]._id
      },
      {
        email: 'admin.marketing@akshay.com',
        password: hashedPassword,
        name: 'Marketing Admin',
        employeeCode: 'ADM005',
        role: 'admin',
        department: departments[4]._id
      },
      
      // Super Admins
      {
        email: 'superadmin@akshay.com',
        password: hashedPassword,
        name: 'Super Admin',
        employeeCode: 'SA001',
        role: 'superadmin'
      },
      {
        email: 'director@akshay.com',
        password: hashedPassword,
        name: 'Director',
        employeeCode: 'SA002',
        role: 'superadmin'
      }
    ]);
    console.log('Created users');

    // Create Tokens
    const tokens = [];
    const statuses = ['pending', 'assigned', 'solved'];
    const priorities = ['low', 'medium', 'high'];
    const regularUsers = users.filter(u => u.role === 'user');
    const admins = users.filter(u => u.role === 'admin');
    
    for (let i = 0; i < 25; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const createdAt = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000);
      const dept = departments[Math.floor(Math.random() * departments.length)];
      
      const token = {
        title: `Token Request ${i + 1}`,
        description: `This is a sample token request for testing purposes. Issue #${i + 1}`,
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        status: status,
        createdBy: regularUsers[Math.floor(Math.random() * regularUsers.length)]._id,
        department: dept._id,
        createdAt: createdAt
      };

      if (status === 'assigned' || status === 'solved') {
        const deptAdmins = admins.filter(a => a.department.toString() === dept._id.toString());
        if (deptAdmins.length > 0) {
          token.assignedTo = deptAdmins[0]._id;
        } else {
          token.assignedTo = admins[0]._id;
        }
      }

      if (status === 'solved') {
        token.solvedAt = new Date(createdAt.getTime() + Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000);
        token.solvedBy = token.assignedTo;
        token.timeToSolve = Math.floor((token.solvedAt - createdAt) / 1000 / 60);
      }

      tokens.push(token);
    }

    await Token.insertMany(tokens);
    console.log('Created tokens');

    console.log('\n=================================');
    console.log('Database seeded successfully!');
    console.log('=================================');
    console.log('\nTest Credentials:');
    console.log('------------------');
    console.log('\nRegular Users:');
    console.log('  Email: john.doe@akshay.com (EMP001)');
    console.log('  Email: alice.johnson@akshay.com (EMP002)');
    console.log('  Password: password123');
    console.log('\nAdmins:');
    console.log('  Email: admin.it@akshay.com (ADM001) - IT Support');
    console.log('  Email: admin.hr@akshay.com (ADM002) - Human Resources');
    console.log('  Email: admin.finance@akshay.com (ADM003) - Finance');
    console.log('  Password: password123');
    console.log('\nSuper Admins:');
    console.log('  Email: superadmin@akshay.com (SA001)');
    console.log('  Email: director@akshay.com (SA002)');
    console.log('  Password: password123');
    console.log('=================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
