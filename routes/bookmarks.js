const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();

// Connect to MongoDB Atlas
mongoose.connect('mongodb+srv://rtimsina42berlin:PxMIkm5kE0rivojE@42friend.x7cxqor.mongodb.net/?retryWrites=true&w=majority&appName=42friend')
	.then(() => console.log('Connected to MongoDB Atlas'))
	.catch(err => console.error('MongoDB connection error:', err));

// Bookmark Schema
const bookmarkSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
  description: { type: String },
  category: { type: String, default: 'General' },
  createdBy: { type: String, default: 'Anonymous' }, // Store user ID or 'Anonymous'
  upvotes: [{ type: String }], // Array of user IDs who upvoted
  downvotes: [{ type: String }], // Array of user IDs who downvoted
  createdAt: { type: Date, default: Date.now },
});

const Bookmark = mongoose.model('Bookmark', bookmarkSchema);

// Middleware to parse JSON bodies
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Create Bookmark (Authenticated or Anonymous)
router.post('/bookmarks', async (req, res) => {
  const { title, url, description, category } = req.body;
  try {
    const bookmark = new Bookmark({
      title,
      url,
      description,
      category,
      createdBy: req.isAuthenticated() ? req.user.displayname : 'Anonymous',
    });
    await bookmark.save();
    res.redirect('/bookmarks?message=Bookmark created successfully!');
  } catch (error) {
    console.error('Error creating bookmark:', error.message);
    res.redirect('/bookmarks?error=Failed to create bookmark.');
  }
});

// List Bookmarks
router.get('/bookmarks', async (req, res) => {
  try {
    const bookmarks = await Bookmark.find().sort({ createdAt: -1 });
    res.render('bookmarks', {
      user: req.user,
      bookmarks,
      success: req.query.success,
      error: req.query.error,
    });
  } catch (error) {
    console.error('Error fetching bookmarks:', error.message);
    res.render('bookmarks', {
      user: req.user,
      bookmarks: [],
      error: 'Failed to load bookmarks.',
    });
  }
});

// Upvote Bookmark
router.post('/bookmarks/:id/upvote', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/bookmarks?error=Please log in to vote.');
  }
  try {
    const bookmark = await Bookmark.findById(req.params.id);
    if (!bookmark) {
      return res.redirect('/bookmarks?error=Bookmark not found.');
    }
    const userId = req.user.displayname;
    if (bookmark.upvotes.includes(userId)) {
      return res.redirect('/bookmarks?error=You already upvoted this bookmark.');
    }
    if (bookmark.downvotes.includes(userId)) {
      bookmark.downvotes.pull(userId); // Remove downvote if exists
    }
    bookmark.upvotes.push(userId);
    await bookmark.save();
    res.redirect('/bookmarks?message=Upvoted successfully!');
  } catch (error) {
    console.error('Error upvoting bookmark:', error.message);
    res.redirect('/bookmarks?error=Failed to upvote bookmark.');
  }
});

// Downvote Bookmark
router.post('/bookmarks/:id/downvote', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/bookmarks?error=Please log in to vote.');
  }
  try {
    const bookmark = await Bookmark.findById(req.params.id);
    if (!bookmark) {
      return res.redirect('/bookmarks?error=Bookmark not found.');
    }
    const userId = req.user.displayname;
    if (bookmark.downvotes.includes(userId)) {
      return res.redirect('/bookmarks?error=You already downvoted this bookmark.');
    }
    if (bookmark.upvotes.includes(userId)) {
      bookmark.upvotes.pull(userId); // Remove upvote if exists
    }
    bookmark.downvotes.push(userId);
    await bookmark.save();
    res.redirect('/bookmarks?message=Downvoted successfully!');
  } catch (error) {
    console.error('Error downvoting bookmark:', error.message);
    res.redirect('/bookmarks?error=Failed to downvote bookmark.');
  }
});

// Add routes to app
// app.use('/', router);

module.exports = router;
