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

// One-time cleanup: merge duplicate folders and reassign their entries
app.post('/api/cleanup-duplicates', async (req, res) => {
    try {
        const folders = await Folder.find().sort({ createdAt: 1 });
        const seen = {};
        const duplicateIds = [];

        for (const f of folders) {
            const name = f.folder_name.trim().toLowerCase();
            if (seen[name]) {
                // This is a duplicate — move its entries to the original folder
                await Entry.updateMany(
                    { folder_id: f._id.toString() },
                    { folder_id: seen[name].toString() }
                );
                duplicateIds.push(f._id);
            } else {
                seen[name] = f._id;
            }
        }

        // Delete duplicate folders
        if (duplicateIds.length > 0) {
            await Folder.deleteMany({ _id: { $in: duplicateIds } });
        }

        res.json({ success: true, duplicatesRemoved: duplicateIds.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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

// Client Portal Login API
app.post('/api/client-login', async (req, res) => {
    try {
        let { folderName, date } = req.body;
        if (!folderName || !date) {
            return res.status(400).json({ success: false, message: 'Folder Name and Date are required' });
        }

        // Find the folder with a case-insensitive regex match
        const folder = await Folder.findOne({ 
            folder_name: { $regex: new RegExp('^' + folderName.trim() + '$', 'i') } 
        });

        if (!folder) {
            return res.status(404).json({ success: false, message: 'Collection not found' });
        }

        // Compare Dates (assuming client sends YYYY-MM-DD, and we format DB date to YYYY-MM-DD)
        const dbDate = new Date(folder.createdAt).toISOString().split('T')[0];
        if (dbDate === date) {
            res.status(200).json({ 
                success: true, 
                folderId: folder._id,
                folderName: folder.folder_name,
                message: 'Welcome to your Collection' 
            });
        } else {
            res.status(401).json({ success: false, message: 'Incorrect Date' });
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
        console.log(`[DEBUG] [AUTH]: Searching for user with identifier: ${identifier}`);
        const user = await User.findOne({
            $or: [{ email: identifier }, { mobile: identifier }]
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = Date.now() + 300000; // 5 mins
        await user.save();
        console.log(`[DEBUG] [AUTH]: OTP generated and saved for user: ${user.email}`);

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
        console.error(`[ERROR] [AUTH]: Forgot Password failed for ${identifier}:`, err.message);
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
        
        // Backend Duplicate Prevention: Check for identical folder name in the last 5 minutes
        const FIVE_MINUTES_AGO = new Date(Date.now() - 5 * 60000);
        const duplicate = await Folder.findOne({
            folder_name: { $regex: new RegExp('^' + folder_name.trim() + '$', 'i') },
            createdAt: { $gte: FIVE_MINUTES_AGO }
        });

        if (duplicate) {
            console.log(`[DEBUG] [BACKEND]: Rejected duplicate folder creation: ${folder_name}`);
            return res.status(409).json({ success: false, message: 'Folder with this name already exists.' });
        }

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
        const { folder_id, name, place, amount } = req.body;
        
        // Backend Duplicate Prevention: Check only if folder_id is a valid ObjectId format
        // (Avoids casting errors for numeric IndexedDB IDs that haven't synced yet)
        if (folder_id && folder_id.length === 24) {
            const ONE_MINUTE_AGO = new Date(Date.now() - 60000);
            const duplicate = await Entry.findOne({
                folder_id,
                name: { $regex: new RegExp('^' + name.trim() + '$', 'i') },
                place: { $regex: new RegExp('^' + place.trim() + '$', 'i') },
                amount,
                createdAt: { $gte: ONE_MINUTE_AGO }
            });

            if (duplicate) {
                console.log(`[DEBUG] [BACKEND] Rejected duplicate entry for folder ${folder_id}`);
                return res.status(409).json({ 
                    success: false, 
                    message: 'Duplicate entry detected. This record was already saved a few seconds ago.' 
                });
            }
        }

        const entry = await Entry.create(req.body);
        res.status(201).json({ ...entry._doc, id: entry._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/entries/:id', async (req, res) => {
    try {
        const entry = await Entry.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ ...entry._doc, id: entry._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/entries/:id', async (req, res) => {
    try {
        await Entry.findByIdAndDelete(req.params.id);
        res.json({ message: 'Entry deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Serve frontend in production (Render.com deployment)
const path = require('path');
const clientDistPath = path.join(__dirname, '../client/dist');

// Middleware to serve static files with correct MIME types
app.use(express.static(clientDistPath, {
    setHeaders: (res, path) => {
        if (path.endsWith('.json') || path.endsWith('.webmanifest')) {
            res.setHeader('Content-Type', 'application/manifest+json');
        }
    }
}));

// Absolute route for manifest to prevent SPA interception
app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'manifest.json'));
});

// API Routes should be above this, and the catch-all below
app.get('*', (req, res) => {
    // Check if the request is for a static file that doesn't exist
    if (req.path.includes('.') && !req.path.startsWith('/api')) {
        return res.status(404).send('Not found');
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Simple Keep-Alive Ping (Runs every 14 minutes to prevent Render from pausing during use)
    setInterval(() => {
        const http = require('http');
        http.get(`http://localhost:${PORT}/api/health`, (res) => {
            // Success
        }).on('error', (err) => {
            console.warn('Keep-alive ping failed (expected if server is starting):', err.message);
        });
    }, 14 * 60 * 1000); 
});
