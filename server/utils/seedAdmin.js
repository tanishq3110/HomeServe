const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/user.model');
const Technician = require('../models/technician.model');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const seedAdminAndDemo = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/homeserve';

  try {
    console.log('[SeedAdmin] Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('[SeedAdmin] Connected.');

    // 1. Seed or update Admin
    const adminEmail = 'admin@homeserve.com';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: 'HomeServe Administrator',
        email: adminEmail,
        password: 'AdminPassword123!',
        phone: '+91 9888877777',
        role: 'ADMIN',
      });
      console.log('[SeedAdmin] Created Admin user:', adminEmail);
    } else {
      admin.role = 'ADMIN';
      await admin.save();
      console.log('[SeedAdmin] Existing admin verified:', adminEmail);
    }

    // 2. Seed a sample verified technician if none exists
    const demoTechEmail = 'rajesh.electrician@homeserve.com';
    let demoTechUser = await User.findOne({ email: demoTechEmail });
    if (!demoTechUser) {
      demoTechUser = await User.create({
        name: 'Rajesh Kumar',
        email: demoTechEmail,
        password: 'Password123!',
        phone: '+91 9876543210',
        role: 'TECHNICIAN',
        profileImage: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=400&q=80',
      });
      console.log('[SeedAdmin] Created demo technician user:', demoTechEmail);
    }

    let demoTechProfile = await Technician.findOne({ userId: demoTechUser._id });
    if (!demoTechProfile) {
      demoTechProfile = await Technician.create({
        userId: demoTechUser._id,
        skills: ['Electrical Wiring', 'MCB Installation', 'Inverter Servicing', 'Ceiling Fan Repair'],
        experience: 7,
        description: 'Licensed residential and commercial electrician with 7+ years of experience across Koramangala and Indiranagar.',
        isAvailable: true,
        verificationStatus: 'APPROVED',
        isVerified: true,
        rating: 4.9,
        totalReviews: 84,
        documents: [
          {
            type: 'ID_PROOF',
            url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80',
            status: 'APPROVED',
          },
          {
            type: 'CERTIFICATE',
            url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
            status: 'APPROVED',
          },
        ],
      });
      console.log('[SeedAdmin] Created approved demo technician profile for Rajesh Kumar.');
    }

    // 3. Seed a pending technician for admin review testing
    const pendingTechEmail = 'anita.plumber@homeserve.com';
    let pendingTechUser = await User.findOne({ email: pendingTechEmail });
    if (!pendingTechUser) {
      pendingTechUser = await User.create({
        name: 'Anita Verma',
        email: pendingTechEmail,
        password: 'Password123!',
        phone: '+91 9765432109',
        role: 'TECHNICIAN',
        profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      });
      console.log('[SeedAdmin] Created pending technician user:', pendingTechEmail);
    }

    let pendingTechProfile = await Technician.findOne({ userId: pendingTechUser._id });
    if (!pendingTechProfile) {
      pendingTechProfile = await Technician.create({
        userId: pendingTechUser._id,
        skills: ['Pipe Leak Repair', 'Bathroom Fitting', 'Water Heater Installation'],
        experience: 4,
        description: 'Professional certified plumber specializing in leak diagnostics and luxury sanitary fitting.',
        isAvailable: false,
        verificationStatus: 'PENDING',
        isVerified: false,
        documents: [
          {
            type: 'ID_PROOF',
            url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80',
            status: 'PENDING',
          },
          {
            type: 'CERTIFICATE',
            url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
            status: 'PENDING',
          },
        ],
      });
      console.log('[SeedAdmin] Created pending technician profile for Anita Verma.');
    }

    console.log('====================================================');
    console.log('[SeedAdmin] Complete! Credentials:');
    console.log('  Admin:         admin@homeserve.com / AdminPassword123!');
    console.log('  Verified Tech: rajesh.electrician@homeserve.com / Password123!');
    console.log('  Pending Tech:  anita.plumber@homeserve.com / Password123!');
    console.log('====================================================');
  } catch (error) {
    console.error('[SeedAdmin] Error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('[SeedAdmin] Disconnected from MongoDB.');
  }
};

if (require.main === module) {
  seedAdminAndDemo()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedAdminAndDemo };
