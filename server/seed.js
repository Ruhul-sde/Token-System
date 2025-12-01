import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import Token from './models/Token.js';
import Department from './models/Department.js';
import AdminProfile from './models/AdminProfile.js';

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
    await AdminProfile.deleteMany({});
    console.log('Cleared existing data');

    // Create Departments with Categories
    const departments = await Department.insertMany([
      {
        name: 'IT Support',
        description: 'Information Technology Support',
        categories: [
          { name: 'Hardware', description: 'Hardware related issues', subCategories: ['Desktop', 'Laptop', 'Printer'] },
          { name: 'Software', description: 'Software related issues', subCategories: ['OS', 'Applications', 'Licenses'] },
          { name: 'Network', description: 'Network connectivity issues', subCategories: ['WiFi', 'LAN', 'VPN'] }
        ]
      },
      {
        name: 'Human Resources',
        description: 'HR Department',
        categories: [
          { name: 'Recruitment', description: 'Hiring and onboarding', subCategories: ['Job Posting', 'Interviews', 'Onboarding'] },
          { name: 'Employee Relations', description: 'Employee concerns', subCategories: ['Grievances', 'Benefits', 'Performance'] },
          { name: 'Payroll', description: 'Salary and compensation', subCategories: ['Salary', 'Deductions', 'Bonuses'] }
        ]
      },
      {
        name: 'Finance',
        description: 'Finance and Accounting',
        categories: [
          { name: 'Accounts Payable', description: 'Vendor payments', subCategories: ['Invoices', 'Payments', 'Reconciliation'] },
          { name: 'Accounts Receivable', description: 'Customer payments', subCategories: ['Billing', 'Collections', 'Credits'] },
          { name: 'Budgeting', description: 'Budget planning', subCategories: ['Planning', 'Forecasting', 'Reports'] }
        ]
      },
      {
        name: 'Operations',
        description: 'Operations Management',
        categories: [
          { name: 'Logistics', description: 'Supply chain management', subCategories: ['Shipping', 'Inventory', 'Warehousing'] },
          { name: 'Quality Control', description: 'Quality assurance', subCategories: ['Testing', 'Inspection', 'Compliance'] }
        ]
      },
      {
        name: 'Marketing',
        description: 'Marketing and Communications',
        categories: [
          { name: 'Digital Marketing', description: 'Online marketing', subCategories: ['SEO', 'Social Media', 'Email Campaigns'] },
          { name: 'Content', description: 'Content creation', subCategories: ['Copywriting', 'Design', 'Video'] },
          { name: 'Events', description: 'Event management', subCategories: ['Planning', 'Promotion', 'Execution'] }
        ]
      },
      {
        name: 'Customer Service',
        description: 'Customer Support',
        categories: [
          { name: 'Technical Support', description: 'Product technical issues', subCategories: ['Troubleshooting', 'Setup', 'Training'] },
          { name: 'General Inquiry', description: 'General questions', subCategories: ['Product Info', 'Orders', 'Returns'] }
        ]
      }
    ]);
    console.log('Created departments with categories');

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

      // Admins - One for each department
      {
        email: 'admin.it@akshay.com',
        password: hashedPassword,
        name: 'IT Admin',
        employeeCode: 'ADM001',
        role: 'admin',
        department: departments[0]._id,
        isActive: true
      },
      {
        email: 'admin.hr@akshay.com',
        password: hashedPassword,
        name: 'HR Admin',
        employeeCode: 'ADM002',
        role: 'admin',
        department: departments[1]._id,
        isActive: true
      },
      {
        email: 'admin.finance@akshay.com',
        password: hashedPassword,
        name: 'Finance Admin',
        employeeCode: 'ADM003',
        role: 'admin',
        department: departments[2]._id,
        isActive: true
      },
      {
        email: 'admin.ops@akshay.com',
        password: hashedPassword,
        name: 'Operations Admin',
        employeeCode: 'ADM004',
        role: 'admin',
        department: departments[3]._id,
        isActive: true
      },
      {
        email: 'admin.marketing@akshay.com',
        password: hashedPassword,
        name: 'Marketing Admin',
        employeeCode: 'ADM005',
        role: 'admin',
        department: departments[4]._id,
        isActive: true
      },
      {
        email: 'admin.cs@akshay.com',
        password: hashedPassword,
        name: 'Customer Service Admin',
        employeeCode: 'ADM006',
        role: 'admin',
        department: departments[5]._id,
        isActive: true
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

    // Create Admin Profiles for each department admin
    const adminUsers = users.filter(u => u.role === 'admin');
    const adminProfiles = [];

    for (let i = 0; i < adminUsers.length; i++) {
      const admin = adminUsers[i];
      const dept = departments.find(d => d._id.toString() === admin.department.toString());
      const categoryNames = dept.categories.map(cat => cat.name);

      adminProfiles.push({
        user: admin._id,
        department: admin.department,
        categories: categoryNames,
        expertise: categoryNames,
        phone: `+1-555-${String(i + 1).padStart(4, '0')}`,
        employeeId: admin.employeeCode,
        isActive: true
      });
    }

    await AdminProfile.insertMany(adminProfiles);
    console.log('Created admin profiles');

    // Create Tokens
    const tokens = [];
    const statuses = ['pending', 'assigned', 'resolved'];
    const priorities = ['low', 'medium', 'high'];
    const regularUsers = users.filter(u => u.role === 'user');

    // Create at least 2 tokens per department
    let tokenCounter = 0;
    for (const dept of departments) {
      for (let j = 0; j < 2; j++) {
        tokenCounter++;
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const createdAt = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000);
        const categoryIndex = Math.floor(Math.random() * dept.categories.length);
        const category = dept.categories[categoryIndex].name;

        const token = {
          tokenNumber: `T${String(tokenCounter).padStart(6, '0')}`,
          title: `${dept.name} - Request ${j + 1}`,
          description: `This is a sample token request for ${dept.name} department. Issue #${tokenCounter}`,
          priority: priorities[Math.floor(Math.random() * priorities.length)],
          status: status,
          createdBy: regularUsers[Math.floor(Math.random() * regularUsers.length)]._id,
          department: dept._id,
          category: category,
          createdAt: createdAt
        };

        if (status === 'assigned' || status === 'resolved') {
          const deptAdmins = adminUsers.filter(a => a.department.toString() === dept._id.toString());
          if (deptAdmins.length > 0) {
            token.assignedTo = deptAdmins[0]._id;
          }
        }

        if (status === 'resolved') {
          token.solvedAt = new Date(createdAt.getTime() + Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000);
          token.solvedBy = token.assignedTo;
          token.timeToSolve = Math.floor((token.solvedAt - createdAt) / 1000 / 60);
        }

        tokens.push(token);
      }
    }

    // Add some random tokens
    for (let i = 0; i < 18; i++) {
      tokenCounter++;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const createdAt = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000);
      const dept = departments[Math.floor(Math.random() * departments.length)];
      const categoryIndex = Math.floor(Math.random() * dept.categories.length);
      const category = dept.categories[categoryIndex].name;

      const token = {
        tokenNumber: `T${String(tokenCounter).padStart(6, '0')}`,
        title: `Token Request ${tokenCounter}`,
        description: `This is a sample token request for testing purposes. Issue #${tokenCounter}`,
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        status: status,
        createdBy: regularUsers[Math.floor(Math.random() * regularUsers.length)]._id,
        department: dept._id,
        category: category,
        createdAt: createdAt
      };

      if (status === 'assigned' || status === 'resolved') {
        const deptAdmins = adminUsers.filter(a => a.department.toString() === dept._id.toString());
        if (deptAdmins.length > 0) {
          token.assignedTo = deptAdmins[0]._id;
        }
      }

      if (status === 'resolved') {
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
    console.log('\nDepartment Admins:');
    console.log('  Email: admin.it@akshay.com (ADM001) - IT Support');
    console.log('  Email: admin.hr@akshay.com (ADM002) - Human Resources');
    console.log('  Email: admin.finance@akshay.com (ADM003) - Finance');
    console.log('  Email: admin.ops@akshay.com (ADM004) - Operations');
    console.log('  Email: admin.marketing@akshay.com (ADM005) - Marketing');
    console.log('  Email: admin.cs@akshay.com (ADM006) - Customer Service');
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