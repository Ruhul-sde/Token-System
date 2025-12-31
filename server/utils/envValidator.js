import chalk from 'chalk';

export const validateEnv = () => {
  const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
  const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

  if (missingEnvVars.length) {
    console.error(
      chalk.red('✗ Missing environment variables:'),
      missingEnvVars.join(', ')
    );
    process.exit(1);
  }

  // Validate MongoDB URI
  if (!process.env.MONGODB_URI.startsWith('mongodb')) {
    console.error(chalk.red('✗ Invalid MONGODB_URI format'));
    process.exit(1);
  }
};