import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useSocket } from '../contexts/SocketContext';
import { 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Copy, 
  ExternalLink,
  Network,
  Clock,
  Activity
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Tunnels = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [tunnelData, setTunnelData] = useState({
    name: '',
    type: 'http',
    localPort: '',
    localHost: 'localhost'
  });
  
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  // Fetch tunnels
  const { data: tunnelsData, isLoading: tunnelsLoading } = useQuery(
    'tunnels',
    async () => {
      const response = await axios.get('/api/tunnel');
      return response.data.tunnels;
    },
    {
      refetchInterval: 30000,
    }
  );

  // Fetch agents
  const { data: agentsData, isLoading: agentsLoading } = useQuery(
    'agents',
    async () => {
      const response = await axios.get('/api/agent');
      return response.data.agents;
    }
  );

  // Create tunnel mutation
  const createTunnelMutation = useMutation(
    async (data) => {
      const response = await axios.post('/api/tunnel', data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tunnels');
        setShowCreateModal(false);
        setTunnelData({
          name: '',
          type: 'http',
          localPort: '',
          localHost: 'localhost'
        });
        toast.success('Tunnel created successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create tunnel');
      }
    }
  );

  // Start tunnel mutation
  const startTunnelMutation = useMutation(
    async (tunnelId) => {
      const response = await axios.post(`/api/tunnel/${tunnelId}/start`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tunnels');
        toast.success('Tunnel started');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to start tunnel');
      }
    }
  );

  // Stop tunnel mutation
  const stopTunnelMutation = useMutation(
    async (tunnelId) => {
      const response = await axios.post(`/api/tunnel/${tunnelId}/stop`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tunnels');
        toast.success('Tunnel stopped');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to stop tunnel');
      }
    }
  );

  // Delete tunnel mutation
  const deleteTunnelMutation = useMutation(
    async (tunnelId) => {
      const response = await axios.delete(`/api/tunnel/${tunnelId}`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tunnels');
        toast.success('Tunnel deleted');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete tunnel');
      }
    }
  );

  const handleCreateTunnel = (e) => {
    e.preventDefault();
    if (!selectedAgent) {
      toast.error('Please select an agent');
      return;
    }
    
    createTunnelMutation.mutate({
      ...tunnelData,
      agentId: selectedAgent,
      localPort: parseInt(tunnelData.localPort)
    });
  };

  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'connecting':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const tunnels = tunnelsData || [];
  const agents = agentsData || [];

  if (tunnelsLoading || agentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Tunnels
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your secure tunnels and expose local services.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Tunnel
          </button>
        </div>
      </div>

      {/* Tunnels List */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {tunnels.map((tunnel) => (
          <div key={tunnel._id} className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Network className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">
                  {tunnel.name}
                </h3>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tunnel.status)}`}>
                {tunnel.status}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Public URL</p>
                <div className="flex items-center mt-1">
                  <p className="text-sm font-medium text-gray-900 truncate flex-1">
                    {tunnel.publicUrl}
                  </p>
                  <button
                    onClick={() => handleCopyUrl(tunnel.publicUrl)}
                    className="ml-2 text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Local Address</p>
                <p className="text-sm font-medium text-gray-900">
                  {tunnel.localHost}:{tunnel.localPort}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="text-sm font-medium text-gray-900 uppercase">
                  {tunnel.type}
                </p>
              </div>

              {tunnel.stats && (
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                  <div className="flex items-center">
                    <Activity className="h-4 w-4 text-gray-400 mr-2" />
                    <div>
                      <p className="text-xs text-gray-500">Connections</p>
                      <p className="text-sm font-medium text-gray-900">
                        {tunnel.stats.connections || 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-gray-400 mr-2" />
                    <div>
                      <p className="text-xs text-gray-500">Uptime</p>
                      <p className="text-sm font-medium text-gray-900">
                        {tunnel.stats.uptime || 0}s
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <div className="flex space-x-2">
                {tunnel.status === 'active' ? (
                  <button
                    onClick={() => stopTunnelMutation.mutate(tunnel._id)}
                    className="btn btn-secondary"
                    disabled={stopTunnelMutation.isLoading}
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={() => startTunnelMutation.mutate(tunnel._id)}
                    className="btn btn-success"
                    disabled={startTunnelMutation.isLoading}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </button>
                )}
              </div>

              <div className="flex space-x-2">
                <a
                  href={tunnel.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={() => deleteTunnelMutation.mutate(tunnel._id)}
                  className="text-red-400 hover:text-red-600"
                  disabled={deleteTunnelMutation.isLoading}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tunnels.length === 0 && (
        <div className="text-center py-12">
          <Network className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tunnels</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new tunnel.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create your first tunnel
            </button>
          </div>
        </div>
      )}

      {/* Create Tunnel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreateTunnel}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Create New Tunnel
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Tunnel Name
                          </label>
                          <input
                            type="text"
                            required
                            className="input mt-1"
                            value={tunnelData.name}
                            onChange={(e) => setTunnelData({ ...tunnelData, name: e.target.value })}
                            placeholder="My Tunnel"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Agent
                          </label>
                          <select
                            required
                            className="input mt-1"
                            value={selectedAgent}
                            onChange={(e) => setSelectedAgent(e.target.value)}
                          >
                            <option value="">Select an agent</option>
                            {agents.map((agent) => (
                              <option key={agent._id} value={agent._id}>
                                {agent.name} ({agent.status})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Type
                          </label>
                          <select
                            className="input mt-1"
                            value={tunnelData.type}
                            onChange={(e) => setTunnelData({ ...tunnelData, type: e.target.value })}
                          >
                            <option value="http">HTTP</option>
                            <option value="https">HTTPS</option>
                            <option value="tcp">TCP</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Local Host
                            </label>
                            <input
                              type="text"
                              className="input mt-1"
                              value={tunnelData.localHost}
                              onChange={(e) => setTunnelData({ ...tunnelData, localHost: e.target.value })}
                              placeholder="localhost"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Local Port
                            </label>
                            <input
                              type="number"
                              required
                              className="input mt-1"
                              value={tunnelData.localPort}
                              onChange={(e) => setTunnelData({ ...tunnelData, localPort: e.target.value })}
                              placeholder="3000"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="btn btn-primary w-full sm:w-auto sm:ml-3"
                    disabled={createTunnelMutation.isLoading}
                  >
                    {createTunnelMutation.isLoading ? 'Creating...' : 'Create Tunnel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-secondary w-full sm:w-auto mt-3 sm:mt-0"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tunnels;
