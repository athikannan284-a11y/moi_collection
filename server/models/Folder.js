const mongoose = require('mongoose');

const FolderSchema = new mongoose.Schema({
    folder_name: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // To support individual user folders if needed
}, { timestamps: true });

module.exports = mongoose.model('Folder', FolderSchema);
