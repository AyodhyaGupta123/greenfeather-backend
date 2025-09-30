const Hero = require('../models/Hero');

exports.getActiveHeros = async (req, res) => {
  try {
    const items = await Hero.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 });
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch hero items' });
  }
};

exports.createHero = async (req, res) => {
  try {
    const { title, imageUrl, subtitle, ctaText, ctaLink, isActive, sortOrder } = req.body;
    if (!title || !imageUrl) return res.status(400).json({ message: 'title and imageUrl are required' });
    const hero = await Hero.create({ title, imageUrl, subtitle, ctaText, ctaLink, isActive, sortOrder });
    res.status(201).json(hero);
  } catch (e) {
    res.status(400).json({ message: 'Failed to create hero' });
  }
};

exports.updateHero = async (req, res) => {
  try {
    const hero = await Hero.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(hero);
  } catch (e) {
    res.status(400).json({ message: 'Failed to update hero' });
  }
};

exports.deleteHero = async (req, res) => {
  try {
    await Hero.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(400).json({ message: 'Failed to delete hero' });
  }
};


