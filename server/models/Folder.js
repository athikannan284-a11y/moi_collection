const mongoose = require('mongoose');

const FolderSchema = new mongoose.Schema({
    folder_name: { type: String, required: true },
    whatsapp_template: { type: String, default: "Hello {name}, ungal moi anbalippu ₹{amount} petrukkondom. Periya Nandrigal!" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // To support individual user folders if needed
}, { timestamps: true });

module.exports = mongoose.model('Folder', FolderSchema);
