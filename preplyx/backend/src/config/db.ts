import mongoose from 'mongoose';
import User from '../models/User';
import Wallet from '../models/Wallet';

export const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cbt';

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Seed admin user 'admin@preplyx.com.ng'
    try {
      let adminUser = await User.findOne({
        $or: [
          { email: 'admin@preplyx.com.ng' },
          { name: 'admin@preplyx.com.ng' },
          { role: 'admin' }
        ]
      });

      if (!adminUser) {
        adminUser = await User.create({
          name: 'PreplyX Admin',
          email: 'admin@preplyx.com.ng',
          password: 'Admin@123456', // will be automatically hashed by pre-save hook
          role: 'admin',
          status: 'active',
        });

        const wallet = await Wallet.create({
          user: adminUser._id,
          balance: 100000,
          totalFunded: 100000,
          totalSpent: 0,
          welcomeBonus: 500,
        });

        adminUser.wallet = wallet._id;
        await adminUser.save();
        console.log('Seeded super admin user "admin@preplyx.com.ng" with password "Admin@123456"');
      } else {
        adminUser.email = 'admin@preplyx.com.ng';
        adminUser.password = 'Admin@123456'; // will be automatically hashed by pre-save hook
        adminUser.role = 'admin';
        adminUser.status = 'active';
        await adminUser.save();
        console.log('Updated super admin user "admin@preplyx.com.ng" credentials to "Admin@123456"');
      }
    } catch (seedError) {
      console.error('Error seeding/updating super admin user:', seedError);
    }
  } catch (error: any) {
    console.error(`MongoDB connection failed: ${error.message}`);
    console.warn('Server will continue without database connection.');
  }
};
