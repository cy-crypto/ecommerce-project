const mongoose = require('mongoose');

const blogSectionSchema = new mongoose.Schema(
  {
    heading: { type: String, trim: true, default: '' },
    paragraphs: { type: [String], default: [] },
    bullets: { type: [String], default: [] }
  },
  { _id: false }
);

const blogSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    excerpt: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, default: 'General' },
    dateLabel: { type: String, trim: true, default: '' },
    readTime: { type: String, trim: true, default: '' },
    image: { type: String, trim: true, default: '' },
    author: { type: String, trim: true, default: 'ScoopCraft Team' },
    coverAlt: { type: String, trim: true, default: '' },
    sections: { type: [blogSectionSchema], default: [] },
    takeaways: { type: [String], default: [] },
    status: { type: String, enum: ['draft', 'published'], default: 'published' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Blog', blogSchema);
