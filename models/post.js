const mongoose = require('mongoose');

let postSchema = new mongoose.Schema({
    user : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    date : {
        type: Date,
        default: Date.now
    },
    content: String,
    cardColor: {
        type: String,
        default: '#ffffff'
    },
    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
        }
    ],
    likesCount: {
        type: Number,
        default: 0
    },
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'comment'
        }
    ],
    image: {
        type: String,
        default: ""
    }

}); 

module.exports = mongoose.model('post', postSchema);