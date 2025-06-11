const express = require('express');
const app = express();

const path = require('path');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const userModel = require('./models/user');
const postModel = require('./models/post'); 
const commentModel = require('./models/comment');

const upload = require('./config/cloudinaryStorage');



app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

app.get('/', isLoggedIn, (req, res, next) => {
    try {
        res.redirect('/home');
    } catch (err) {
        next(err);
    }
});

app.get('/home', isLoggedIn, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 16;
        const skip = (page - 1) * limit;

        const posts = await postModel.find({}).sort({ _id: -1 }).skip(skip).limit(limit);
        const allusers = await userModel.find({});
        const total = await postModel.countDocuments();
        const hasMore = skip + posts.length < total;

        if (req.xhr) {
            return res.json({ posts, allusers, hasMore });
        }

        res.render('home', {
            user: req.user,
            posts,
            allusers,
            currentPage: page,
            hasMore
        });
    } catch (err) {
        next(err);
    }
});

app.get('/home/following', isLoggedIn, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 16;
        const skip = (page - 1) * limit;

        const followingIds = [...req.user.following];

        const posts = await postModel.find({ user: { $in: followingIds } })
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit);

        const allusers = await userModel.find({ _id: { $in: followingIds } });
        const total = await postModel.countDocuments({ user: { $in: followingIds } });
        const hasMore = skip + posts.length < total;

        if (req.xhr) {
            return res.json({ posts, allusers, hasMore });
        }

        res.render('home_following', {
            user: req.user,
            posts,
            allusers,
            currentPage: page,
            hasMore
        });
    } catch (err) {
        next(err);
    }
});

app.get('/login', (req, res, next) => {
    try {
        res.render('login');
    } catch (err) {
        next(err);
    }
});

app.get('/signup', (req, res, next) => {
    try {
        res.render('signup');
    } catch (err) {
        next(err);
    }
});

app.post('/create-user', async (req, res, next) => {
    try {
        let { fullname, username, email, password } = req.body;
        let user = await userModel.findOne({
            $or: [{ email: email }, { username: username }]
        });
        if (user) {
            res.render('signup', { userexists: true });
        } else {
            bcrypt.genSalt(10, async (err, salt) => {
                if (err) return next(err);
                bcrypt.hash(password, salt, async (err, hash) => {
                    if (err) return next(err);
                    let newUser = await userModel.create({
                        fullname: fullname,
                        username: username,
                        email: email,
                        password: hash
                    });
                    let token = jwt.sign({ email: email, id: newUser._id }, process.env.SECRET_KEY);
                    res.cookie('token', token);
                    res.redirect('/');
                });
            });
        }
    } catch (err) {
        next(err);
    }
});

app.post('/login-user', async (req, res, next) => {
    try {
        let { email, password } = req.body;
        let user = await userModel.findOne({ email: email });
        if (!user) {
            res.render('login', { usernotfound: true });
        } else {
            bcrypt.compare(password, user.password, (err, result) => {
                if (err) return next(err);
                if (result) {
                    let token = jwt.sign({ email: email, id: user._id }, process.env.SECRET_KEY);
                    res.cookie('token', token);
                    res.redirect('/');
                } else {
                    res.render('login', { passwordwrong: true });
                }
            });
        }
    } catch (err) {
        next(err);
    }
});

app.get('/logout', (req, res, next) => {
    try {
        res.clearCookie('token');
        res.redirect('/login');
    } catch (err) {
        next(err);
    }
});

app.get('/myprofile', isLoggedIn, async (req, res, next) => {
    try {
        let user = req.user;
        let posts = await postModel.find({ user: user._id });
        posts = posts.reverse();
        res.render('myprofile', { user: user, userposts: posts });
    } catch (err) {
        next(err);
    }
});

app.get('/myprofile/followers', isLoggedIn, async (req, res, next) => {
    try {
        let user = req.user;
        let followers = await userModel.find({ _id: { $in: user.followers } });
        res.render('followers_page', { user: user, followers: followers });
    } catch (err) {
        next(err);
    }
});

app.get('/myprofile/following', isLoggedIn, async (req, res, next) => {
    try {
        let user = req.user;
        let following = await userModel.find({ _id: { $in: user.following } });
        res.render('following_page', { user: user, following: following });
    } catch (err) {
        next(err);
    }
});

app.get('/myprofile/edit', isLoggedIn, async (req, res, next) => {
    try {
        let user = req.user;
        res.render('edit_profile', { user: user });
    } catch (err) {
        next(err);
    }
});

app.post('/update-profile', isLoggedIn, upload.single('icon'), async (req, res, next) => {
    try {
        let { fullname, username, bio, email } = req.body;
        const icon = req.file ? req.file.path : req.user.icon;

        let user = req.user;
        user.username = username || user.username;
        user.fullname = fullname || user.fullname;
        user.email = email || user.email;
        user.bio = bio || user.bio;
        user.icon = icon;
        await user.save();
        res.redirect('/myprofile');

    } catch (err) {
        next(err);
    }
});

app.get('/newpost', isLoggedIn, (req, res, next) => {
    try {
        res.render('create_post', { user: req.user });
    } catch (err) {
        next(err);
    }
});

app.post('/create-post', isLoggedIn, upload.single('postImage'), async (req, res, next) => {
  try {
    const { cardColor, content } = req.body;
    const user = req.user;
    const image = req.file ? req.file.path : "";

    const newPost = await postModel.create({
      content,
      cardColor,
      image,
      user: user._id
    });

    user.posts.push(newPost._id);
    await user.save();

    res.redirect('/myprofile');
  } catch (err) {
    next(err);
  }
});


app.get('/deletepost/:id', isLoggedIn, async (req, res, next) => {
    try {
        let postId = req.params.id;
        let user = req.user;
        let post = await postModel.findById(postId);
        if (post && post.user.toString() === user._id.toString()) {
            await postModel.deleteOne({ _id: postId });
            user.posts = user.posts.filter(p => p.toString() !== postId);
            await user.save();
        }
        res.redirect('/myprofile');
    } catch (err) {
        next(err);
    }
});

app.get('/profile/:username', isLoggedIn, async (req, res, next) => {
    try {
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
    } catch (err) {
        next(err);
    }
});

app.get('/profile/:username/followers', isLoggedIn, async (req, res, next) => {
    try {
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
    } catch (err) {
        next(err);
    }
});

app.get('/profile/:username/following', isLoggedIn, async (req, res, next) => {
    try {
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
    } catch (err) {
        next(err);
    }
});

app.post('/toggle-like/:postId', isLoggedIn, async (req, res, next) => {
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

app.post('/toggle-follow/:otherUserId', isLoggedIn, async (req, res, next) => {
    try {
        const user = req.user;
        const otherUserId = req.params.otherUserId;
        if (user._id.equals(otherUserId)) {
            return res.status(400).send("Can't follow yourself");
        }
        const isFollowing = user.following.includes(otherUserId);
        if (isFollowing) {
            
            user.following.pull(otherUserId);
            await userModel.findByIdAndUpdate(otherUserId, { $pull: { followers: user._id } });
        } else {
            
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

app.post('/remove-follower/:followerId', isLoggedIn, async (req, res, next) => {
    try {
        const user = req.user;
        const followerId = req.params.followerId;
        
        user.followers = user.followers.filter(id => id.toString() !== followerId);
        await user.save();
        
        await userModel.findByIdAndUpdate(followerId, {
            $pull: { following: user._id }
        });
        res.status(200).send('Removed');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error removing follower');
    }
});

app.get('/post/:postId', isLoggedIn, async (req, res, next) => {
    try {
        const postId = req.params.postId;
        const post = await postModel.findById(postId);
        if (!post) {
            return res.redirect('/');
        }
        const postuser = await userModel.findById(post.user);
        if (!postuser) {
            return res.redirect('/');
        }
        const comments = await commentModel.find({ post: postId });
        comments.reverse();
        const allusers = await userModel.find({});
        res.render('post_page', { user: req.user, post: post, postuser: postuser, comments: comments, allusers: allusers });
    } catch (err) {
        next(err);
    }
});

app.get('/post/:postId/likes', isLoggedIn, async (req, res, next) => {
    try {
        const postId = req.params.postId;
        const post = await postModel.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        const postuser = await userModel.findById(post.user);
        if (!postuser) {
            return res.redirect('/');
        }
        const comments = await commentModel.find({ post: postId });
        comments.reverse();
        const allusers = await userModel.find({});
        
        const likedUsers = await userModel.find({ _id: { $in: post.likes } });
        res.render('post_page_likes', { user: req.user, post: post, postuser: postuser, comments : comments, likedUsers: likedUsers });
    } catch (err) {
        next(err);
    }
});

app.post('/add-comment/:postId', isLoggedIn, async (req, res, next) => {
    try {
        const postId = req.params.postId;
        const comment = req.body.comment;
        const post = await postModel.findById(postId);
        if (!post) {
            return res.status(404).send('Post not found');
        }
        const newcomment = await commentModel.create({
            user: req.user._id,
            content: comment,
            post: postId
        });
        post.comments.push(newcomment._id);
        await post.save();
        res.redirect(`/post/${postId}`);
    } catch (err) {
        next(err);
    }
});

app.get('/deletecomment/:commentId', isLoggedIn, async (req, res, next) => {
    try {
        const commentId = req.params.commentId;
        const comment = await commentModel.findById(commentId);
        if (!comment) {
            return res.status(404).send('Comment not found');
        }
        if (comment.user.toString() !== req.user._id.toString()) {
            return res.status(403).send('You are not authorized to delete this comment');
        }
        const post = await postModel.findById(comment.post);
        await commentModel.deleteOne({ _id: commentId });
        res.redirect(`/post/${post._id}`);
    } catch (err) {
        next(err);
    }
});

function isLoggedIn(req, res, next) {
    let token = req.cookies.token;
    if (token) {
        jwt.verify(token, process.env.SECRET_KEY, async (err, decoded) => {
            if (err) {
                return res.redirect('/login');
            }
            try {
                const user = await userModel.findById(decoded.id);
                if (!user) {
                    return res.redirect('/login');
                }
                req.user = user;
                next();
            } catch (err) {
                next(err);
            }
        });
    } else {
        res.redirect('/login');
    }
}


app.get('/password', (req, res, next) => {
    try {
        res.render('password', { user: req.user });
    } catch (err) {
        next(err);
    }
});


const nodemailer = require("nodemailer");
const otpStore = {};

app.post('/forgot-password', async (req, res, next) => {
  const { email } = req.body;
  try {
    const user = await userModel.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000); 
    otpStore[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 }; 

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD 
      }
    });

    await transporter.sendMail({
      from: '"Europa Support" <' + process.env.EMAIL + '>',
      to: email,
      subject: "Your OTP for Password Reset",
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    });

    res.json({ msg: "OTP sent" });
  } catch (err) {
    next(err);
  }
});


app.post('/verify-otp', (req, res, next) => {
  const { email, otp } = req.body;
  const record = otpStore[email];

  if (!record || record.otp != otp || Date.now() > record.expiresAt) {
    return res.status(400).json({ msg: "Invalid or expired OTP" });
  }

  const token = jwt.sign({ email }, process.env.SECRET_KEY, { expiresIn: "10m" });
  res.json({ msg: "OTP verified", token });
});


app.post('/reset-password', async (req, res, next) => {
  const { token, newPassword } = req.body;

  try {
    const { email } = jwt.verify(token, process.env.SECRET_KEY);
    const hashed = await bcrypt.hash(newPassword, 10);
    await userModel.findOneAndUpdate({ email }, { password: hashed });

    delete otpStore[email];
    res.json({ msg: "Password updated" });
  } catch (err) {
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
});


app.get('/search', isLoggedIn, async (req, res, next) => {
   res.render('search', { user: req.user });
});

app.get('/api/search-users', isLoggedIn, async (req, res, next) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);

        const users = await userModel.find({
            username: { $regex: query, $options: 'i' }
        }).limit(10);

        res.json(users);
    } catch (err) {
        next(err);
    }
});



app.use((err, req, res, next) => {
    console.error(err.stack);
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).send('Something went wrong!');
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});