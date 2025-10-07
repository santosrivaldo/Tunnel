const Agent = require('../models/Agent');
const User = require('../models/User');

class AgentManager {
  constructor(io) {
    this.io = io;
    this.activeAgents = new Map();
  }

  async registerAgent(socket, data) {
    const { token, system, network } = data;

    try {
      // Find agent by token
      const agent = await Agent.findOne({ token, isActive: true });
      if (!agent) {
        throw new Error('Invalid agent token');
      }

      // Check if user can create more agents
      const user = await User.findById(agent.userId);
      if (!user.canCreateAgent()) {
        throw new Error('Agent limit reached for your plan');
      }

      // Update agent with connection info
      agent.socketId = socket.id;
      agent.status = 'online';
      agent.lastSeen = new Date();
      agent.system = system;
      agent.network = network;
      await agent.save();

      // Add log entry
      await agent.addLog('info', 'Agent connected', {
        socketId: socket.id,
        system,
        network
      });

      // Store active agent
      this.activeAgents.set(socket.id, agent);

      // Notify user
      this.io.to(agent.userId.toString()).emit('agent:connected', {
        agentId: agent._id,
        name: agent.name,
        status: 'online'
      });

      return agent;
    } catch (error) {
      console.error('Error registering agent:', error);
      throw error;
    }
  }

  async handleHeartbeat(socket) {
    try {
      const agent = this.activeAgents.get(socket.id);
      if (!agent) {
        return;
      }

      // Update heartbeat
      await agent.updateHeartbeat();

      // Send heartbeat acknowledgment
      socket.emit('heartbeat:ack');

    } catch (error) {
      console.error('Error handling heartbeat:', error);
    }
  }

  async handleDisconnection(socket) {
    try {
      const agent = this.activeAgents.get(socket.id);
      if (!agent) {
        return;
      }

      // Update agent status
      await agent.setOffline();

      // Add log entry
      await agent.addLog('info', 'Agent disconnected', {
        socketId: socket.id
      });

      // Remove from active agents
      this.activeAgents.delete(socket.id);

      // Notify user
      this.io.to(agent.userId.toString()).emit('agent:disconnected', {
        agentId: agent._id,
        name: agent.name,
        status: 'offline'
      });

    } catch (error) {
      console.error('Error handling disconnection:', error);
    }
  }

  async createAgent(userId, name) {
    try {
      // Check if user can create more agents
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.canCreateAgent()) {
        throw new Error('Agent limit reached for your plan');
      }

      // Create new agent
      const agent = new Agent({
        userId,
        name,
        status: 'offline'
      });

      await agent.save();

      // Update user usage
      user.usage.totalAgents += 1;
      await user.save();

      // Add log entry
      await agent.addLog('info', 'Agent created', {
        name,
        userId
      });

      return agent;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }

  async deleteAgent(agentId, userId) {
    try {
      const agent = await Agent.findOne({ _id: agentId, userId });
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Disconnect if online
      if (agent.status === 'online' && agent.socketId) {
        const socket = this.io.sockets.sockets.get(agent.socketId);
        if (socket) {
          socket.disconnect();
        }
      }

      // Delete agent
      await Agent.findByIdAndDelete(agentId);

      // Update user usage
      const user = await User.findById(userId);
      if (user) {
        user.usage.totalAgents = Math.max(0, user.usage.totalAgents - 1);
        await user.save();
      }

      // Notify user
      this.io.to(userId.toString()).emit('agent:deleted', {
        agentId
      });

      return true;
    } catch (error) {
      console.error('Error deleting agent:', error);
      throw error;
    }
  }

  async getUserAgents(userId) {
    try {
      const agents = await Agent.find({ userId, isActive: true })
        .sort({ createdAt: -1 });

      return agents;
    } catch (error) {
      console.error('Error getting user agents:', error);
      throw error;
    }
  }

  async getAgentStats(agentId) {
    try {
      const agent = await Agent.findById(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      return {
        agentId: agent._id,
        name: agent.name,
        status: agent.status,
        lastSeen: agent.lastSeen,
        stats: agent.stats,
        connectionDuration: agent.connectionDuration
      };
    } catch (error) {
      console.error('Error getting agent stats:', error);
      throw error;
    }
  }

  async sendCommandToAgent(agentId, command, data) {
    try {
      const agent = await Agent.findById(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      if (agent.status !== 'online') {
        throw new Error('Agent is not online');
      }

      // Send command to agent
      this.io.to(agent.socketId).emit('agent:command', {
        command,
        data
      });

      return true;
    } catch (error) {
      console.error('Error sending command to agent:', error);
      throw error;
    }
  }

  async updateAgentConfig(agentId, config) {
    try {
      const agent = await Agent.findById(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Update config
      agent.config = { ...agent.config, ...config };
      await agent.save();

      // Add log entry
      await agent.addLog('info', 'Agent config updated', {
        config
      });

      // Notify agent if online
      if (agent.status === 'online' && agent.socketId) {
        this.io.to(agent.socketId).emit('agent:config:updated', {
          config: agent.config
        });
      }

      return agent;
    } catch (error) {
      console.error('Error updating agent config:', error);
      throw error;
    }
  }

  async getActiveAgents() {
    try {
      const agents = await Agent.find({ status: 'online', isActive: true })
        .populate('userId', 'name email')
        .sort({ lastSeen: -1 });

      return agents;
    } catch (error) {
      console.error('Error getting active agents:', error);
      throw error;
    }
  }

  async getAgentLogs(agentId, limit = 50) {
    try {
      const agent = await Agent.findById(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Get recent logs
      const logs = agent.logs
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);

      return logs;
    } catch (error) {
      console.error('Error getting agent logs:', error);
      throw error;
    }
  }
}

module.exports = AgentManager;
