import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { User } from '../models/User.js';

const router = Router();

// GET /api/admin/mentors - List all mentors for admin
router.get('/mentors', requireAdmin, async (req, res, next) => {
  try {
    const mentors = await User.find({ role: 'mentor' })
      .sort({ createdAt: -1 });
    res.json({ success: true, mentors });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/:id - Delete a user or mentor account
router.delete('/users/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    await User.deleteOne({ _id: id });
    res.json({ success: true, message: 'User account deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
