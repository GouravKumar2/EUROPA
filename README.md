# EUROPA

EUROPA is a full-featured social media web application built with Node.js, Express, MongoDB, and EJS. It allows users to create posts, follow others, like and comment on posts, customize their profiles, and search for users in real time. The app features a modern, responsive UI and supports image uploads via Cloudinary.

## Features

- **User Authentication**: Secure signup, login, and JWT-based session management.
- **Password Recovery**: Email-based OTP and password reset flow.
- **Profile Management**: Edit profile, upload profile picture, set bio, view followers/following.
- **Post Creation**: Create posts with text, color themes, and optional image uploads.
- **Feed**: Discover feed (all posts) and Following feed (posts from followed users), with infinite scroll.
- **Likes & Comments**: Like/unlike posts, add/delete comments, view who liked a post.
- **User Search**: Real-time search for users by username.
- **Responsive UI**: Modern design with EJS templates and custom CSS.

## Project Structure

```
EUROPA/
├── app.js                     # Main Express app and routes
├── package.json               # Project metadata and dependencies
├── config/                    # Cloudinary and Mongoose config
│   ├── cloudinaryConfig.js
│   ├── cloudinaryStorage.js
│   └── mongoose-connection.js
├── models/                    # Mongoose models
│   ├── user.js
│   ├── post.js
│   └── comment.js
├── public/                    # Static assets
│   ├── stylesheets/           # CSS files for each page
│   ├── media/                 # Images/icons
│   └── js/                    # (Optional) Client-side JS
├── views/                     # EJS templates
│   ├── partials/              # EJS partials (e.g., post card)
│   └── ...                    # Pages: home, profile, post, search, etc.
└── README.md
```

## Setup & Installation

1. **Clone the repository:**
   ```powershell
   git clone <repository-url>
   cd EUROPA
   ```
2. **Install dependencies:**
   ```powershell
   npm install
   ```
3. **Configure environment variables:**
   - Create a `.env` file in the root directory with:
     ```env
     MONGO_URI=your_mongodb_uri
     SECRET_KEY=your_jwt_secret
     CLOUD_NAME=your_cloudinary_cloud_name
     API_KEY=your_cloudinary_api_key
     API_SECRET=your_cloudinary_api_secret
     EMAIL=your_email_for_nodemailer
     EMAIL_PASSWORD=your_email_password
     ```
4. **Run the app:**
   ```powershell
   npm start
   ```
   The app will be available at `http://localhost:3000`.

## Main Endpoints & Pages

- `/` or `/home` — Main feed (all posts)
- `/home/following` — Feed of posts from followed users
- `/login` & `/signup` — Authentication
- `/password` — Password recovery (OTP via email)
- `/myprofile` — Your profile (edit, view posts, followers, following)
- `/profile/:username` — View other users' profiles
- `/newpost` — Create a new post
- `/search` — Real-time user search
- `/post/:postId` — View a single post and comments
- `/post/:postId/likes` — See who liked a post
- `/api/search-users` — API for user search (AJAX)

## Technologies Used
- **Backend:** Node.js, Express, MongoDB, Mongoose
- **Frontend:** EJS, HTML, CSS, JavaScript
- **Authentication:** JWT, bcrypt
- **File Uploads:** Multer, Cloudinary
- **Email:** Nodemailer (for password reset)

## Notable Details
- **Security:** Passwords are hashed, JWT is used for sessions, and routes are protected.
- **Image Uploads:** Profile icons and post images are stored on Cloudinary.
- **AJAX:** Used for real-time search and infinite scrolling feeds.
- **Customizable Posts:** Users can pick card colors and upload images.
- **Modern UI:** All pages are styled for a clean, modern look.

