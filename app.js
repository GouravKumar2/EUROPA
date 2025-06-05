const express = require('express');
const app = express();

const path = require('path');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userModel = require('./models/user');
const postModel = require('./models/post'); 



app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

app.get('/', isLoggedIn,  (req, res) => {
    res.redirect('/home');
});

app.get('/home', isLoggedIn, async (req, res) => {
    let user = req.user;
    let posts = await postModel.find({});
    posts = posts.reverse();
    let allusers = await userModel.find({});
    res.render('home', { user: user, posts: posts, allusers: allusers });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/create-user', async (req, res) => {
    let {fullname, username, email, password } = req.body;
    
    let user = await userModel.findOne({ 
        $or: [ { email: email }, { username: username } ] 
    });
    if (user) {
        res.render('signup', { userexists: true });
    }
    else {
        
        bcrypt.genSalt(10, async (err, salt) => {
            
            bcrypt.hash(password, salt, async (err, hash) => {
                
                let newUser = await userModel.create({
                    fullname: fullname,
                    username: username,
                    email: email,
                    password: hash
                });
                
                let token = jwt.sign({ email : email, id: newUser._id }, "secretkey");
                res.cookie('token', token);
                res.redirect('/');
            });
        });
        
    }   
});

app.post('/login-user', async (req, res) => {
    let { email, password } = req.body;
    
    let user = await userModel.findOne({ email: email });
    if (!user) {
        res.render('login', { usernotfound: true });
    }
    else {
        bcrypt.compare(password, user.password, (err, result) => {
            if (result) {
                let token = jwt.sign({ email : email, id: user._id }, "secretkey");
                res.cookie('token', token);
                res.redirect('/');
            }
            else {
                res.render('login', { passwordwrong: true });
            }
        });
    }
});

app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

app.get('/myprofile', isLoggedIn, async (req, res) => {
    let user = req.user;
    let posts = await postModel.find({ user: user._id });
    posts = posts.reverse();
    res.render('myprofile', { user: user, userposts: posts });
});

app.get('/myprofile/followers', isLoggedIn, async (req, res) => {
    let user = req.user;
    let followers = await userModel.find({ _id: { $in: user.followers } });
    res.render('followers_page', { user: user, followers: followers });
});

app.get('/myprofile/following', isLoggedIn, async (req, res) => {
    let user = req.user;
    let following = await userModel.find({ _id: { $in: user.following } });
    res.render('following_page', { user: user, following: following });
});

app.get('/myprofile/edit', isLoggedIn, async (req, res) => {
    let user = req.user;
    res.render('edit_profile', { user: user });
});

app.post('/update-profile', isLoggedIn, async (req, res) => {
    let { icon, username, bio, email } = req.body;
    let user = req.user;
    
    if (username) {
        user.username = username;
    }
    if (email) {
        user.email = email;
    }
    if (bio) {
        user.bio = bio;
    }
    if (icon) {
        user.icon = icon;
    }
    
    await user.save();
    res.redirect('/myprofile');
});

app.get('/newpost', isLoggedIn, (req, res) => {
    res.render('create_post', { user: req.user });
});

app.post('/create-post', isLoggedIn, async (req, res) => {
    let { cardColor, content } = req.body;
    let user = req.user;
    
    let newPost = await postModel.create({
        content: content,
        cardColor: cardColor,
        user: user._id
    });
    
    user.posts.push(newPost._id);
    await user.save();
    res.redirect('/myprofile');
});

app.get('/deletepost/:id', isLoggedIn, async (req, res) => {
    let postId = req.params.id;
    let user = req.user;
    
    let post = await postModel.findById(postId);
    if (post && post.user.toString() === user._id.toString()) {
        await postModel.deleteOne({ _id: postId });
        user.posts = user.posts.filter(p => p.toString() !== postId);
        await user.save();
    }
    
    res.redirect('/myprofile');
});

app.get('/profile/:username', isLoggedIn, async (req, res) => {
    let username = req.params.username;
    let otheruser = await userModel.findOne({ username: username });
    if (!otheruser) {
        return res.render('/');
    }

    if (otheruser._id.toString() === req.user._id.toString()) {
        return res.redirect('/myprofile');
    }

    let posts = await postModel.find({ user: otheruser._id });
    posts = posts.reverse();
    res.render('other_profile', { user: req.user, otheruser: otheruser, userposts: posts });

});

app.get('/profile/:username/followers', isLoggedIn, async (req, res) => {
    let username = req.params.username;
    let otheruser = await userModel.findOne({ username: username });
    if (!otheruser) {
        return res.redirect('/');
    }

    if (otheruser._id.toString() === req.user._id.toString()) {
        return res.redirect('/myprofile/followers');
    }

    let followers = await userModel.find({ _id: { $in: otheruser.followers } });
    res.render('other_followers', { user: req.user, followers: followers, otheruser: otheruser });
});

app.get('/profile/:username/following', isLoggedIn, async (req, res) => {
    let username = req.params.username;
    let otheruser = await userModel.findOne({ username: username });
    if (!otheruser) {
        return res.redirect('/');
    }
    if (otheruser._id.toString() === req.user._id.toString()) {
        return res.redirect('/myprofile/following');
    }
    let following = await userModel.find({ _id: { $in: otheruser.following } });
    res.render('other_following', { user: req.user, following: following, otheruser: otheruser });
});

app.post('/toggle-like/:postId', isLoggedIn, async (req, res) => {
    try {
        const post = await postModel.findById(req.params.postId);
        const userId = req.user._id;

        if (!post) return res.status(404).send('Post not found');

        const index = post.likes.indexOf(userId);
        if (index === -1) {
            post.likes.push(userId);
            post.likesCount += 1;
        } else {
            post.likes.splice(index, 1);
            post.likesCount -= 1;
        }

        await post.save();
        res.status(200).send('OK');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error toggling like');
    }
});

app.post('/toggle-follow/:otherUserId', isLoggedIn, async (req, res) => {
    try {
        const user = req.user;
        const otherUserId = req.params.otherUserId;

        if (user._id.equals(otherUserId)) {
            return res.status(400).send("Can't follow yourself");
        }

        const isFollowing = user.following.includes(otherUserId);

        if (isFollowing) {
            // Unfollow
            user.following.pull(otherUserId);
            await userModel.findByIdAndUpdate(otherUserId, { $pull: { followers: user._id } });
        } else {
            // Follow
            user.following.push(otherUserId);
            await userModel.findByIdAndUpdate(otherUserId, { $addToSet: { followers: user._id } });
        }

        await user.save();
        res.send("Success");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error toggling follow");
    }
});

app.post('/remove-follower/:followerId', isLoggedIn, async (req, res) => {
    try {
        const user = req.user;
        const followerId = req.params.followerId;

        // Remove followerId from user's followers
        user.followers = user.followers.filter(id => id.toString() !== followerId);
        await user.save();

        // Also remove user from follower's "following" list
        await userModel.findByIdAndUpdate(followerId, {
            $pull: { following: user._id }
        });

        res.status(200).send('Removed');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error removing follower');
    }
});


function isLoggedIn(req, res, next) {
    let token = req.cookies.token;
    if (token) {
        jwt.verify(token, "secretkey", async (err, decoded) => {
            if (err) {
                res.redirect('/login');
            }
            else {
                const decoded = jwt.verify(token, "secretkey");
                const user = await userModel.findById(decoded.id);
                
                if (!user) {
                    return res.redirect('/login');
                }
                
                req.user = user;
                next();
              
            }
        });
    }
    else {
        res.redirect('/login');
    }
}

app.listen(3000)