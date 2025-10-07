const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Tunnel = require('../models/Tunnel');
const Agent = require('../models/Agent');

const router = express.Router();

// Admin middleware
const adminAuth = async (req, res, next) => {
  try {
    if (!req.user || req.user.plan !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   GET /api/admin/stats
// @desc    Get admin dashboard stats
// @access  Private (Admin)
router.get('/stats', auth, adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalTunnels = await Tunnel.countDocuments();
    const activeTunnels = await Tunnel.countDocuments({ status: 'active' });
    const totalAgents = await Agent.countDocuments();
    const onlineAgents = await Agent.countDocuments({ status: 'online' });

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers
      },
      tunnels: {
        total: totalTunnels,
        active: activeTunnels
      },
      agents: {
        total: totalAgents,
        online: onlineAgents
      }
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private (Admin)
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/users/:id
// @desc    Get user details
// @access  Private (Admin)
router.get('/users/:id', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's tunnels and agents
    const tunnels = await Tunnel.find({ userId: req.params.id });
    const agents = await Agent.find({ userId: req.params.id });

    res.json({
      user,
      tunnels,
      agents
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user
// @access  Private (Admin)
router.put('/users/:id', [
  auth,
  adminAuth,
  body('plan').optional().isIn(['free', 'basic', 'pro', 'enterprise']).withMessage('Invalid plan'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { plan, isActive } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    if (plan !== undefined) user.plan = plan;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Private (Admin)
router.delete('/users/:id', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user's tunnels and agents
    await Tunnel.deleteMany({ userId: req.params.id });
    await Agent.deleteMany({ userId: req.params.id });

    // Delete user
    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/tunnels
// @desc    Get all tunnels
// @access  Private (Admin)
router.get('/tunnels', auth, adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const tunnels = await Tunnel.find()
      .populate('userId', 'name email')
      .populate('agentId', 'name status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Tunnel.countDocuments();

    res.json({
      tunnels,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get tunnels error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/agents
// @desc    Get all agents
// @access  Private (Admin)
router.get('/agents', auth, adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const agents = await Agent.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Agent.countDocuments();

    res.json({
      agents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/logs
// @desc    Get system logs
// @access  Private (Admin)
router.get('/logs', auth, adminAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const level = req.query.level;

    let query = {};
    if (level) {
      query.level = level;
    }

    // Get logs from all models
    const tunnelLogs = await Tunnel.aggregate([
      { $unwind: '$logs' },
      { $match: query },
      { $sort: { 'logs.timestamp': -1 } },
      { $limit: limit },
      { $project: { logs: 1, subdomain: 1, userId: 1 } }
    ]);

    const agentLogs = await Agent.aggregate([
      { $unwind: '$logs' },
      { $match: query },
      { $sort: { 'logs.timestamp': -1 } },
      { $limit: limit },
      { $project: { logs: 1, name: 1, userId: 1 } }
    ]);

    // Combine and sort logs
    const allLogs = [...tunnelLogs, ...agentLogs]
      .sort((a, b) => new Date(b.logs.timestamp) - new Date(a.logs.timestamp))
      .slice(0, limit);

    res.json({ logs: allLogs });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
