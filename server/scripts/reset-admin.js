require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const resetAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const adminEmail = 'aathikannan284@gmail.com';
        const hashedPassword = await bcrypt.hash('aathiKANNANmanikandan@2007', 10);
        
        const res = await User.findOneAndUpdate(
            { email: adminEmail },
            { 
                mobile: '8903228802',
                password: hashedPassword 
            },
            { upsert: true, new: true }
        );
        console.log('Admin user reset/created successfully:', res.email);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
};

resetAdmin();
