const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/agent
// @desc    Get user agents
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const agents = await req.agentManager.getUserAgents(req.userId);
    res.json({ agents });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/agent
// @desc    Create new agent
// @access  Private
router.post('/', [
  auth,
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name } = req.body;

    const agent = await req.agentManager.createAgent(req.userId, name);

    res.status(201).json({
      message: 'Agent created successfully',
      agent: {
        id: agent._id,
        name: agent.name,
        token: agent.token,
        status: agent.status,
        createdAt: agent.createdAt
      }
    });
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   GET /api/agent/:id
// @desc    Get agent details
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const agent = await Agent.findOne({ _id: req.params.id, userId: req.userId });
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.json({ agent });
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/agent/:id
// @desc    Update agent
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
    const agent = await Agent.findOne({ _id: req.params.id, userId: req.userId });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Update fields
    if (name !== undefined) agent.name = name;
    if (isActive !== undefined) agent.isActive = isActive;

    await agent.save();

    res.json({
      message: 'Agent updated successfully',
      agent
    });
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/agent/:id
// @desc    Delete agent
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    await req.agentManager.deleteAgent(req.params.id, req.userId);
    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   GET /api/agent/:id/stats
// @desc    Get agent statistics
// @access  Private
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const stats = await req.agentManager.getAgentStats(req.params.id);
    res.json({ stats });
  } catch (error) {
    console.error('Get agent stats error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   GET /api/agent/:id/logs
// @desc    Get agent logs
// @access  Private
router.get('/:id/logs', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await req.agentManager.getAgentLogs(req.params.id, limit);
    res.json({ logs });
  } catch (error) {
    console.error('Get agent logs error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   POST /api/agent/:id/command
// @desc    Send command to agent
// @access  Private
router.post('/:id/command', [
  auth,
  body('command').isString().withMessage('Command is required'),
  body('data').optional().isObject().withMessage('Data must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { command, data } = req.body;
    await req.agentManager.sendCommandToAgent(req.params.id, command, data);

    res.json({ message: 'Command sent successfully' });
  } catch (error) {
    console.error('Send command error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   PUT /api/agent/:id/config
// @desc    Update agent configuration
// @access  Private
router.put('/:id/config', [
  auth,
  body('config').isObject().withMessage('Config must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { config } = req.body;
    const agent = await req.agentManager.updateAgentConfig(req.params.id, config);

    res.json({
      message: 'Agent configuration updated successfully',
      agent
    });
  } catch (error) {
    console.error('Update agent config error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   POST /api/agent/:id/regenerate-token
// @desc    Regenerate agent token
// @access  Private
router.post('/:id/regenerate-token', auth, async (req, res) => {
  try {
    const agent = await Agent.findOne({ _id: req.params.id, userId: req.userId });
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Generate new token
    agent.token = Agent.generateToken();
    await agent.save();

    // Add log entry
    await agent.addLog('info', 'Token regenerated', {
      newToken: agent.token
    });

    res.json({
      message: 'Token regenerated successfully',
      token: agent.token
    });
  } catch (error) {
    console.error('Regenerate token error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
