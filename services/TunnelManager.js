const Tunnel = require('../models/Tunnel');
const Agent = require('../models/Agent');
const User = require('../models/User');

class TunnelManager {
  constructor(io) {
    this.io = io;
    this.activeTunnels = new Map();
    this.tunnelProxies = new Map();
  }

  async createTunnel(socket, data) {
    const { userId, agentId, name, type, localPort, localHost } = data;

    try {
      // Validate user exists and can create tunnels
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.canCreateTunnel()) {
        throw new Error('Tunnel limit reached for your plan');
      }

      // Validate agent exists and is online
      const agent = await Agent.findById(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      if (agent.status !== 'online') {
        throw new Error('Agent is not online');
      }

      // Generate unique subdomain
      const subdomain = await this.generateUniqueSubdomain(name);
      const publicUrl = `${subdomain}.${process.env.BASE_DOMAIN}`;

      // Create tunnel
      const tunnel = new Tunnel({
        userId,
        agentId,
        name,
        subdomain,
        type,
        localPort,
        localHost,
        publicUrl,
        status: 'connecting'
      });

      await tunnel.save();

      // Update user usage
      user.usage.totalTunnels += 1;
      await user.save();

      // Add log entry
      await tunnel.addLog('info', 'Tunnel created', {
        subdomain,
        type,
        localPort,
        localHost
      });

      // Notify agent to start tunnel
      socket.to(agent.socketId).emit('tunnel:start', {
        tunnelId: tunnel._id,
        subdomain,
        type,
        localPort,
        localHost
      });

      // Store active tunnel
      this.activeTunnels.set(tunnel._id.toString(), {
        tunnel,
        socket,
        agentSocketId: agent.socketId
      });

      return tunnel;
    } catch (error) {
      console.error('Error creating tunnel:', error);
      throw error;
    }
  }

  async generateUniqueSubdomain(name) {
    const baseSubdomain = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    let subdomain = baseSubdomain;
    let counter = 1;

    while (true) {
      const existing = await Tunnel.findOne({ subdomain });
      if (!existing) {
        return subdomain;
      }
      subdomain = `${baseSubdomain}${counter}`;
      counter++;
    }
  }

  async startTunnel(tunnelId, agentSocket) {
    try {
      const tunnel = await Tunnel.findById(tunnelId);
      if (!tunnel) {
        throw new Error('Tunnel not found');
      }

      // Update tunnel status
      tunnel.status = 'active';
      await tunnel.save();

      // Add log entry
      await tunnel.addLog('info', 'Tunnel started', {
        tunnelId: tunnel._id
      });

      // Notify user
      this.io.to(tunnel.userId.toString()).emit('tunnel:started', {
        tunnelId: tunnel._id,
        status: 'active'
      });

      return tunnel;
    } catch (error) {
      console.error('Error starting tunnel:', error);
      throw error;
    }
  }

  async stopTunnel(tunnelId) {
    try {
      const tunnel = await Tunnel.findById(tunnelId);
      if (!tunnel) {
        throw new Error('Tunnel not found');
      }

      // Update tunnel status
      tunnel.status = 'inactive';
      await tunnel.save();

      // Add log entry
      await tunnel.addLog('info', 'Tunnel stopped', {
        tunnelId: tunnel._id
      });

      // Remove from active tunnels
      this.activeTunnels.delete(tunnelId.toString());

      // Notify user
      this.io.to(tunnel.userId.toString()).emit('tunnel:stopped', {
        tunnelId: tunnel._id,
        status: 'inactive'
      });

      return tunnel;
    } catch (error) {
      console.error('Error stopping tunnel:', error);
      throw error;
    }
  }

  async deleteTunnel(tunnelId, userId) {
    try {
      const tunnel = await Tunnel.findOne({ _id: tunnelId, userId });
      if (!tunnel) {
        throw new Error('Tunnel not found');
      }

      // Stop tunnel if active
      if (tunnel.status === 'active') {
        await this.stopTunnel(tunnelId);
      }

      // Delete tunnel
      await Tunnel.findByIdAndDelete(tunnelId);

      // Update user usage
      const user = await User.findById(userId);
      if (user) {
        user.usage.totalTunnels = Math.max(0, user.usage.totalTunnels - 1);
        await user.save();
      }

      // Notify user
      this.io.to(userId.toString()).emit('tunnel:deleted', {
        tunnelId
      });

      return true;
    } catch (error) {
      console.error('Error deleting tunnel:', error);
      throw error;
    }
  }

  handleTunnelData(socket, data) {
    const { tunnelId, type, payload } = data;
    
    try {
      const activeTunnel = this.activeTunnels.get(tunnelId);
      if (!activeTunnel) {
        return;
      }

      // Handle different types of tunnel data
      switch (type) {
        case 'request':
          this.handleTunnelRequest(activeTunnel, payload);
          break;
        case 'response':
          this.handleTunnelResponse(activeTunnel, payload);
          break;
        case 'error':
          this.handleTunnelError(activeTunnel, payload);
          break;
        default:
          console.warn('Unknown tunnel data type:', type);
      }
    } catch (error) {
      console.error('Error handling tunnel data:', error);
    }
  }

  handleTunnelRequest(activeTunnel, payload) {
    // Forward request to local service
    const { tunnel, agentSocketId } = activeTunnel;
    
    // Emit to agent to handle the request
    this.io.to(agentSocketId).emit('tunnel:forward', {
      tunnelId: tunnel._id,
      payload
    });
  }

  handleTunnelResponse(activeTunnel, payload) {
    // Forward response to client
    const { tunnel } = activeTunnel;
    
    // This would typically forward to the client making the request
    // Implementation depends on how you handle client connections
  }

  handleTunnelError(activeTunnel, payload) {
    const { tunnel } = activeTunnel;
    
    // Log error
    tunnel.addLog('error', 'Tunnel error', payload);
    
    // Notify user
    this.io.to(tunnel.userId.toString()).emit('tunnel:error', {
      tunnelId: tunnel._id,
      error: payload
    });
  }

  handleDisconnection(socket) {
    // Find and handle disconnection for tunnels
    for (const [tunnelId, activeTunnel] of this.activeTunnels) {
      if (activeTunnel.socket.id === socket.id) {
        this.stopTunnel(tunnelId);
      }
    }
  }

  async getTunnelStats(tunnelId) {
    try {
      const tunnel = await Tunnel.findById(tunnelId);
      if (!tunnel) {
        throw new Error('Tunnel not found');
      }

      return {
        tunnelId: tunnel._id,
        status: tunnel.status,
        stats: tunnel.stats,
        uptime: tunnel.stats.uptime,
        lastConnection: tunnel.stats.lastConnection,
        bytesTransferred: tunnel.stats.bytesTransferred
      };
    } catch (error) {
      console.error('Error getting tunnel stats:', error);
      throw error;
    }
  }

  async getUserTunnels(userId) {
    try {
      const tunnels = await Tunnel.find({ userId, isActive: true })
        .populate('agentId', 'name status lastSeen')
        .sort({ createdAt: -1 });

      return tunnels;
    } catch (error) {
      console.error('Error getting user tunnels:', error);
      throw error;
    }
  }
}

module.exports = TunnelManager;
