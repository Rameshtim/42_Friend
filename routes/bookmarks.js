const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();



// Connect to MongoDB Atlas
mongoose.connect(`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_CLUSTER}/?retryWrites=true&w=majority&appName=42friend`)
	.then(() => console.log('Connected to MongoDB Atlas'))
	.catch(err => console.error('MongoDB connection error:', err));

// Bookmark Schema
const bookmarkSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
  description: { type: String },
  category: { type: String, default: 'General' },
  createdBy: { type: String, default: 'Anonymous' }, // Store user ID or 'Anonymous'
  upvotes: [{ type: String }],
  downvotes: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

const Bookmark = mongoose.model('Bookmark', bookmarkSchema);
const { body, validationResult } = require('express-validator');

// Middleware to parse JSON bodies
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Create Bookmark (Authenticated or Anonymous)
router.post('/bookmarks', [
	// Validate and sanitize input
	body('title').isString().trim().escape().notEmpty().withMessage('Title is required.'),
	body('url').isURL().withMessage('URL must be a valid URL.'),
	body('description').optional().isString().trim().escape(),
	body('category').optional().isString().trim().escape()
		.isLength({ max: 20 }).withMessage('Category should not exceed 20 characters.')
		.matches(/^[a-zA-Z0-9\s\-_,]+$/).withMessage('Category can only contain alphanumeric characters and spaces, hyphens, or commas.'),
  ], async (req, res) => {
	// Check for validation errors
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.redirect('/bookmarks?error=' + encodeURIComponent(errors.array().map(err => err.msg).join(' ')));
	}
  
	const { title, url, description, category } = req.body;
	// Normalize category: lowercase and capitalize first letter
	const normalizeCategory = (input) => {
		if (!input) return undefined;
		const lower = input.trim().toLowerCase();
		return lower.charAt(0).toUpperCase() + lower.slice(1);
	};
	
	const normalizedCategory = normalizeCategory(category);
  try {
    const bookmark = new Bookmark({
      title,
      url,
      description,
      category: normalizedCategory,
      createdBy: (!req.isAuthenticated() || req.body.anonymous === 'on') ? 'Anonymous' : req.user.username,
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
    const userId = req.user.username;
    if (bookmark.upvotes.includes(userId)) {
		bookmark.upvotes.pull(userId);
		await bookmark.save();
		return res.redirect('/bookmarks?message=Removed upvote.');
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
	  console.log("this is id", req.params.id);
	  console.log("and bookmark", bookmark);
	  if (!bookmark) {
		return res.redirect('/bookmarks?error=Bookmark not found.');
	  }
  
	  const userId = req.user.username;
  
	  if (bookmark.downvotes.includes(userId)) {
		bookmark.downvotes.pull(userId);
		await bookmark.save();
		return res.redirect('/bookmarks?message=Removed Downvote.');
	  }
  
	  if (bookmark.upvotes.includes(userId)) {
		bookmark.upvotes.pull(userId); // Remove upvote if exists
	  }
  
	  bookmark.downvotes.push(userId);
  
	  // 👇 Auto delete if 5 or more downvotes
	  if (bookmark.downvotes.length >= 5) {
		await bookmark.deleteOne();
		return res.redirect('/bookmarks?message=Bookmark removed due to downvotes.');
	  }
  
	  await bookmark.save();
	  res.redirect('/bookmarks?message=Downvoted successfully!');
	} catch (error) {
	  console.error('Error downvoting bookmark:', error.message);
	  res.redirect('/bookmarks?error=Failed to downvote bookmark.');
	}
  });
  

router.get('/bookmarks/delete-all', async (req, res) => {
	// if (!req.isAuthenticated()) {
	// 	return res.redirect('/bookmarks?error=Please log in to vote.');
	// }
	try {
		const { userme, passme } = req.query;

		// Check credentials from query against environment variables
		if (
			userme !== process.env.ADMIN_USERNAME ||
			passme !== process.env.ADMIN_PASSWORD
		) {
			return res.status(401).redirect('/bookmarks?error=Unauthorized');
		}
		await Bookmark.deleteMany({});
		res.redirect('/bookmarks?message=All bookmarks deleted.');
	} catch (error) {
	  console.error('Error deleting bookmarks:', error.message);
	  res.redirect('/bookmarks?error=Failed to delete bookmarks.');
	}
  });

  router.get('/bookmarks/delete-one', async (req, res) => {
	if (!req.isAuthenticated()) {
		return res.redirect('/bookmarks?error=Please log in to vote.');
	}
	try {
		const { user, pass, title, createdBy, category } = req.query;

		// Authentication
		if (
			user !== process.env.ADMIN_USERNAME ||
			pass !== process.env.ADMIN_PASSWORD
		) {
			return res.status(401).redirect('/bookmarks?error=Unauthorized');
		}

		// Build dynamic filter
		const filter = {};
		if (title) filter.title = title;
		if (createdBy) filter.createdBy = createdBy;
		if (category) filter.category = category;

		if (Object.keys(filter).length === 0) {
			return res.redirect('/bookmarks?error=No filter provided');
		}

		// Find and delete one matching bookmark
		const result = await Bookmark.findOneAndDelete(filter);

		if (!result) {
			return res.redirect('/bookmarks?error=No matching bookmark found');
		}

		res.redirect('/bookmarks?message=Bookmark deleted');
	} catch (error) {
		console.error('Error deleting bookmark:', error.message);
		res.redirect('/bookmarks?error=Failed to delete bookmark');
	}
});


  
module.exports = router;
