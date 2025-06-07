const mongoose = require('mongoose');

let commentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    date: {
        type: Date,
        default: Date.now
    },
    content: String,
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'post'
    },
});

module.exports = mongoose.model('comment', commentSchema);