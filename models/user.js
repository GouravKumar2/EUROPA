const mongoose = require('mongoose');

let userSchema = new mongoose.Schema({
    fullname: String,
    username: String,
    email: String,
    password: String,
    posts : [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'post'
    }],
    icon : {
        type: String,
        default: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png'
    },
    bio : {
        type: String,
        default: 'This user has not set a bio yet.'
    },
    followers : [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }],
    following : [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }]
}); 

module.exports = mongoose.model('User', userSchema);