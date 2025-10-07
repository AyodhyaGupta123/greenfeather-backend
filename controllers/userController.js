const User = require('../models/User');

// GET /api/users/profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, email, password } = req.body || {};
    if (name) user.name = name;
    if (email) user.email = email;
    if (password) user.password = password;

    const updated = await user.save();
    res.json({ _id: updated._id, name: updated.name, email: updated.email });
  } catch (err) {
    next(err);
  }
};

