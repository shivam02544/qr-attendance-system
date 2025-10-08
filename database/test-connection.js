import { initializeDatabase, checkDatabaseHealth } from './utils.js';

async function testConnection() {
  console.log('Testing database connection...');
  
  try {
    // Test initialization
    await initializeDatabase();
    console.log('✅ Database initialization successful');
    
    // Test health check
    const health = await checkDatabaseHealth();
    console.log('✅ Database health check:', health);
    
    console.log('\n🎉 All database tests passed!');
    console.log('\nNext steps:');
    console.log('1. Set up your .env.local file with MONGODB_URI');
    console.log('2. Run "npm run seed" to populate with sample data');
    console.log('3. Start development with "npm run dev"');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure MongoDB is running');
    console.log('2. Check your MONGODB_URI in .env.local');
    console.log('3. Ensure network connectivity to your database');
  } finally {
    process.exit(0);
  }
}

testConnection();