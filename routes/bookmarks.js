const mongoose = require('mongoose');
const express = require('express');
const cron = require('node-cron');
const axios = require('axios');
const { EmailService } = require('./emailService');
const emailService = new EmailService();
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
	expiresAt: { type: Date },
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
	if (!req.isAuthenticated()) {
		return res.redirect('/bookmarks?error=Please log in to vote.');
		}
	// Check for validation errors
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.redirect('/bookmarks?error=' + encodeURIComponent(errors.array().map(err => err.msg).join(' ')));
	}
	
	const { title, url, description, category, expiryDate } = req.body;
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
		if (expiryDate) {
			bookmark.expiresAt = new Date(expiryDate);
		}
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
		// const bookmarks = await Bookmark.find().sort({ createdAt: -1 });
		const bookmarks = await Bookmark.aggregate([
			{
			  $addFields: {
				upvoteCount: { $size: "$upvotes" }
			  }
			},
			{
			  $sort: { upvoteCount: -1, createdAt: -1 } // Secondary sort by date if same upvotes
			}
		  ]);		  
		const categoryLabels = {
			'42_links': '42 Links',
			'Temp_1': 'Temporary_24 hrs',
			'Temp_7': 'Articles (7 days life)',
			'Temp_30': 'Hackathons (30 days life)',
			};
			res.render('bookmarks', {
				user: req.user,
				bookmarks,
			categoryLabels,
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
	//   console.log("this is id", req.params.id);
	//   console.log("and bookmark", bookmark);
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

// Run every 24 hour
// cron.schedule('*/10 * * * * *', async () => {
cron.schedule('0 */8 * * *', async () => {
	try {
		const now = new Date();

		const conditions = [
			{ category: 'Temp_1', expiry: 24 * 60 * 60 * 1000 }, // 1 day
			{ category: 'Temp_7', expiry: 7 * 24 * 60 * 60 * 1000 }, // 7 days
			{ category: 'Temp_30', expiry: 30 * 24 * 60 * 60 * 1000 }, // 30 days
		];

		for (const { category, expiry } of conditions) {
			const thresholdDate = new Date(now.getTime() - expiry);
			const deleted = await Bookmark.deleteMany({
				category,
				createdAt: { $lt: thresholdDate },
			});
			if (deleted.deletedCount > 0) {
				console.log(`Cleaned up ${deleted.deletedCount} old bookmarks from ${category}`);
			}
			const expiredCustom = await Bookmark.deleteMany({
				expiresAt: { $lt: now },
			});
	
			if (expiredCustom.deletedCount > 0) {
				console.log(`🗑️ Deleted ${expiredCustom.deletedCount} bookmarks with custom expiry dates`);
			}
		}
	} catch (err) {
		console.error('Scheduled cleanup error:', err.message);
	}
});

// Run daily at 2:00 AM
cron.schedule('0 2 * * *', async () => {

	try {
		const count = await Bookmark.estimatedDocumentCount();
		const avgSizeKB = 1; // 700 bytes per bookmark
		const estimatedSizeMB = (count * avgSizeKB) / 1024;

		console.log(`Estimated DB size: ${estimatedSizeMB.toFixed(2)} MB`);
	
	
		if (estimatedSizeMB > 450) {
		
		await emailService.sendStatusChangeEmailAlso("DB Storage Warning", process.env.ADMIN_MAIL, "Hello World", estimatedSizeMB);
			const now = new Date();
			const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

			let totalDeleted = 0;

			// Priority 2: Old + 2+ downvotes
			const r2 = await Bookmark.deleteMany({
				createdAt: { $lt: daysAgo(7) },
				downvotes: { $size: { $gte: 2 } },
			});
			totalDeleted += r2.deletedCount || 0;
			if (r2.deletedCount) console.log(`🗑️ Deleted ${r2.deletedCount} old bookmarks with ≥2 downvotes`);

			// Priority 3: Old + no upvotes
			const r3 = await Bookmark.deleteMany({
				createdAt: { $lt: daysAgo(14) },
				upvotes: { $size: 0 },
			});
			totalDeleted += r3.deletedCount || 0;
			if (r3.deletedCount) console.log(`🗑️ Deleted ${r3.deletedCount} old unvoted bookmarks`);

			// Priority 4: Delete oldest if still over budget
			if (totalDeleted < 100) {
				const stillTooBig = ((count - totalDeleted) * avgSizeKB) / 1024 > 400;
				if (stillTooBig) {
					const fallback = await Bookmark.find().sort({ createdAt: 1 }).limit(200 - totalDeleted);
					const fallbackIds = fallback.map((b) => b._id);
					const r4 = await Bookmark.deleteMany({ _id: { $in: fallbackIds } });
					totalDeleted += r4.deletedCount || 0;
					console.log(`🧹 Fallback: Deleted ${r4.deletedCount} oldest bookmarks`);
				}
			}

			console.log(`✅ Cleanup complete. Total bookmarks deleted: ${totalDeleted}`);
		} else if (estimatedSizeMB >= 400) {
		await emailService.sendStatusChangeEmailAlso("DB Storage Warning", process.env.ADMIN_MAIL, "Hello World", estimatedSizeMB);
	} else if (estimatedSizeMB >= 300) {
		await emailService.sendStatusChangeEmailAlso("DB Storage Warning", process.env.ADMIN_MAIL, "Hello World", estimatedSizeMB);
	} else if (estimatedSizeMB >= 200) {
		await emailService.sendStatusChangeEmailAlso("DB Storage Warning", process.env.ADMIN_MAIL, "Hello World", estimatedSizeMB);
	} else if (estimatedSizeMB >= 100) {
		await emailService.sendStatusChangeEmailAlso("DB Storage Warning", process.env.ADMIN_MAIL, "Hello World", estimatedSizeMB);
	} else if (estimatedSizeMB >= 50) {
		await emailService.sendStatusChangeEmailAlso("DB Storage Warning", process.env.ADMIN_MAIL, "Hello World", estimatedSizeMB);
	}
	} catch (err) {
		console.error('[❌ CLEANUP ERROR]', err.message);
	}
});




	
module.exports = router;
