const mongoose = require('mongoose');

const EntrySchema = new mongoose.Schema({
    folder_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', required: true, index: true },
    name: { type: String, required: true },
    place: { type: String, required: true },
    mobile: { type: String },
    amount: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Entry', EntrySchema);
