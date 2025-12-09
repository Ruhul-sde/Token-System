
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Token from './models/Token.js';

dotenv.config();

const fixTimeToSolve = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all resolved tokens
    const resolvedTokens = await Token.find({ 
      status: 'resolved',
      solvedAt: { $exists: true },
      createdAt: { $exists: true }
    });

    console.log(`Found ${resolvedTokens.length} resolved tokens to check`);

    let updated = 0;
    for (const token of resolvedTokens) {
      // Recalculate timeToSolve in milliseconds
      const correctTimeToSolve = new Date(token.solvedAt) - new Date(token.createdAt);
      
      // If timeToSolve is missing or seems incorrect (too small), update it
      if (!token.timeToSolve || token.timeToSolve < 1000) {
        token.timeToSolve = correctTimeToSolve;
        await token.save();
        updated++;
        console.log(`Updated token ${token.tokenNumber}: ${correctTimeToSolve}ms`);
      }
    }

    console.log(`\nFixed ${updated} tokens`);
    console.log('Migration complete!');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixTimeToSolve();
