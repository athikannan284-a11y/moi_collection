require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const testLogin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const identifier = '8903228802';
        const passwordPlain = 'aathiKANNANmanikandan@2007';
        
        const user = await User.findOne({
            $or: [{ email: identifier }, { mobile: identifier }]
        });

        if (!user) {
            console.log('User not found.');
            process.exit(1);
        }

        console.log('User found:', user.email, user.mobile);
        const isMatch = await bcrypt.compare(passwordPlain, user.password);
        console.log('Password Match with aathiKANNANmanikandan@2007:', isMatch);

        const passwordPlain2 = 'aathiKANNAN@2026';
        const isMatch2 = await bcrypt.compare(passwordPlain2, user.password);
        console.log('Password Match with aathiKANNAN@2026:', isMatch2);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
};

testLogin();
