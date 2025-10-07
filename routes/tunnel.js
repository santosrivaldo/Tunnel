const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/tunnel
// @desc    Get user tunnels
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const tunnels = await req.tunnelManager.getUserTunnels(req.userId);
    res.json({ tunnels });
  } catch (error) {
    console.error('Get tunnels error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/tunnel
// @desc    Create new tunnel
// @access  Private
router.post('/', [
  auth,
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('agentId').isMongoId().withMessage('Valid agent ID is required'),
  body('type').isIn(['http', 'tcp', 'https']).withMessage('Type must be http, tcp, or https'),
  body('localPort').isInt({ min: 1, max: 65535 }).withMessage('Local port must be between 1 and 65535'),
  body('localHost').optional().isString().withMessage('Local host must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, agentId, type, localPort, localHost = 'localhost' } = req.body;

    const tunnel = await req.tunnelManager.createTunnel(req.io, {
      userId: req.userId,
      agentId,
      name,
      type,
      localPort,
      localHost
    });

    res.status(201).json({
      message: 'Tunnel created successfully',
      tunnel
    });
  } catch (error) {
    console.error('Create tunnel error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   GET /api/tunnel/:id
// @desc    Get tunnel details
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const tunnel = await Tunnel.findOne({ _id: req.params.id, userId: req.userId });
    if (!tunnel) {
      return res.status(404).json({ message: 'Tunnel not found' });
    }

    res.json({ tunnel });
  } catch (error) {
    console.error('Get tunnel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/tunnel/:id
// @desc    Update tunnel
// @access  Private
router.put('/:id', [
  auth,
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, isActive } = req.body;
    const tunnel = await Tunnel.findOne({ _id: req.params.id, userId: req.userId });

    if (!tunnel) {
      return res.status(404).json({ message: 'Tunnel not found' });
    }

    // Update fields
    if (name !== undefined) tunnel.name = name;
    if (isActive !== undefined) tunnel.isActive = isActive;

    await tunnel.save();

    res.json({
      message: 'Tunnel updated successfully',
      tunnel
    });
  } catch (error) {
    console.error('Update tunnel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/tunnel/:id/start
// @desc    Start tunnel
// @access  Private
router.post('/:id/start', auth, async (req, res) => {
  try {
    const tunnel = await req.tunnelManager.startTunnel(req.params.id);
    res.json({
      message: 'Tunnel started successfully',
      tunnel
    });
  } catch (error) {
    console.error('Start tunnel error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   POST /api/tunnel/:id/stop
// @desc    Stop tunnel
// @access  Private
router.post('/:id/stop', auth, async (req, res) => {
  try {
    const tunnel = await req.tunnelManager.stopTunnel(req.params.id);
    res.json({
      message: 'Tunnel stopped successfully',
      tunnel
    });
  } catch (error) {
    console.error('Stop tunnel error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   DELETE /api/tunnel/:id
// @desc    Delete tunnel
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    await req.tunnelManager.deleteTunnel(req.params.id, req.userId);
    res.json({ message: 'Tunnel deleted successfully' });
  } catch (error) {
    console.error('Delete tunnel error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   GET /api/tunnel/:id/stats
// @desc    Get tunnel statistics
// @access  Private
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const stats = await req.tunnelManager.getTunnelStats(req.params.id);
    res.json({ stats });
  } catch (error) {
    console.error('Get tunnel stats error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   GET /api/tunnel/:id/logs
// @desc    Get tunnel logs
// @access  Private
router.get('/:id/logs', auth, async (req, res) => {
  try {
    const tunnel = await Tunnel.findOne({ _id: req.params.id, userId: req.userId });
    if (!tunnel) {
      return res.status(404).json({ message: 'Tunnel not found' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const logs = tunnel.logs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    res.json({ logs });
  } catch (error) {
    console.error('Get tunnel logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
