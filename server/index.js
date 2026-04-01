require('dotenv').config({ path: require('path').resolve(__dirname, './.env') });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./db');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('./models/User');
const Folder = require('./models/Folder');
const Entry = require('./models/Entry');

const app = express();
const PORT = process.env.PORT || 5000;

// Configuration
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());

// Initialize default admin user if not exists
const initializeAdmin = async () => {
    try {
        const adminEmail = 'aathikannan284@gmail.com';
        const hashedPassword = await bcrypt.hash('aathiKANNANmanikandan@2007', 10);
        
        const existingUser = await User.findOne({ email: adminEmail });
        if (!existingUser) {
            await User.create({
                email: adminEmail,
                mobile: '8903228802',
                password: hashedPassword
            });
            console.log('Admin user initialized');
        }
    } catch (err) {
        console.error('Initialization error:', err.message);
    }
};

// Connect to Database and Initialize Admin
connectDB().then(() => {
    initializeAdmin();
});

// Health check endpoint (for UptimeRobot to prevent cold starts)
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Login API (Supports Email or Mobile)
app.post('/api/login', async (req, res) => {
    let { identifier, password } = req.body; // 'identifier' can be email or mobile
    identifier = identifier ? identifier.trim() : '';
    password = password ? password.trim() : '';
    try {
        const user = await User.findOne({
            $or: [{ email: identifier }, { mobile: identifier }]
        });

        if (user && await bcrypt.compare(password, user.password)) {
            res.status(200).json({ success: true, message: 'Logged in successfully' });
        } else {
            res.status(401).json({ success: false, message: 'Incorrect credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Forgot Password API (Send OTP)
app.post('/api/auth/forgot-password', async (req, res) => {
    let { identifier } = req.body;
    identifier = identifier ? identifier.trim() : '';
    try {
        const user = await User.findOne({
            $or: [{ email: identifier }, { mobile: identifier }]
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = Date.now() + 300000; // 5 mins
        await user.save();

        // Send Email (Mocking for now if credentials not in .env)
        console.log(`OTP for ${identifier}: ${otp}`);
        
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            try {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
                });

                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject: 'Your Moi Collector Password Reset OTP',
                    text: `Your OTP code is: ${otp}. Valid for 5 minutes.`
                });
            } catch (mailErr) {
                console.warn('Mail delivery failed:', mailErr.message);
                // We still returned success because the OTP was saved and logged to console
            }
        }

        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Verify OTP API
app.post('/api/auth/verify-otp', async (req, res) => {
    let { identifier, otp } = req.body;
    identifier = identifier ? identifier.trim() : '';
    try {
        const user = await User.findOne({
            $or: [{ email: identifier }, { mobile: identifier }],
            otp,
            otpExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });
        res.json({ success: true, message: 'OTP verified' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reset Password API
app.post('/api/auth/reset-password', async (req, res) => {
    let { identifier, otp, newPassword } = req.body;
    identifier = identifier ? identifier.trim() : '';
    try {
        const user = await User.findOne({
            $or: [{ email: identifier }, { mobile: identifier }],
            otp,
            otpExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ message: 'Invalid session' });

        user.password = await bcrypt.hash(newPassword, 10);
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Folders API ---
app.get('/api/folders', async (req, res) => {
    try {
        const folders = await Folder.find().sort({ createdAt: -1 });
        res.json(folders.map(f => ({ ...f._doc, id: f._id })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/folders', async (req, res) => {
    try {
        const { folder_name } = req.body;
        const folder = await Folder.create({ folder_name });
        res.status(201).json({ ...folder._doc, id: folder._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/folders/:id', async (req, res) => {
    try {
        await Folder.findByIdAndDelete(req.params.id);
        await Entry.deleteMany({ folder_id: req.params.id });
        res.json({ message: 'Folder deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/folders/:id', async (req, res) => {
    try {
        const folder = await Folder.findByIdAndUpdate(req.params.id, { folder_name: req.body.folder_name }, { new: true });
        res.json({ ...folder._doc, id: folder._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Entries API ---
app.get('/api/folders/:folderId/entries', async (req, res) => {
    try {
        const entries = await Entry.find({ folder_id: req.params.folderId }).sort({ createdAt: -1 });
        res.json(entries.map(e => ({ ...e._doc, id: e._id })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/entries', async (req, res) => {
    try {
        const entry = await Entry.create(req.body);
        res.status(201).json({ ...entry._doc, id: entry._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Serve frontend in production (Render.com deployment)
const path = require('path');
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
