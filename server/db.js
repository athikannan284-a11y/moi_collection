require('dotenv').config({ path: require('path').resolve(__dirname, './.env') });
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/moi_collection';
        // Log sanitized URI (masking password if present)
        const sanitizedUri = uri.replace(/\/\/.*:.*@/, '//****:****@');
        console.log(`Connecting to MongoDB: ${sanitizedUri}`);
        
        await mongoose.connect(uri);
        console.log('MongoDB Connected Successfully');
    } catch (err) {
        console.error('MongoDB Connection Error:', err.message);
        // Do NOT exit process. This allows the web server to stay online even if DB is down.
        console.warn('Server will continue to run without database connectivity.');
    }
};

module.exports = connectDB;
