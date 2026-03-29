const sqlite3 = require('sqlite3').verbose();
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Folder = require('../models/Folder');
const Entry = require('../models/Entry');

const migrate = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/moi_collection';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const dbPath = path.resolve(__dirname, '../moi.db');
        const db = new sqlite3.Database(dbPath);

        // Migrate Folders
        db.all('SELECT * FROM folders', [], async (err, sqliteFolders) => {
            if (err) throw err;
            
            for (const sFolder of sqliteFolders) {
                const folder = await Folder.create({
                    folder_name: sFolder.folder_name,
                    createdAt: sFolder.created_at
                });
                console.log(`Migrated Folder: ${sFolder.folder_name}`);

                // Migrate Entries for this folder
                db.all('SELECT * FROM entries WHERE folder_id = ?', [sFolder.id], async (err, sqliteEntries) => {
                    if (err) throw err;
                    for (const sEntry of sqliteEntries) {
                        await Entry.create({
                            folder_id: folder._id,
                            name: sEntry.name,
                            place: sEntry.place,
                            mobile: sEntry.mobile,
                            amount: sEntry.amount,
                            createdAt: sEntry.created_at
                        });
                    }
                    console.log(`  Migrated ${sqliteEntries.length} entries`);
                });
            }
        });

        console.log('Migration process started. (SQLite is async, check logs)');
    } catch (err) {
        console.error('Migration failed:', err.message);
    }
};

migrate();
