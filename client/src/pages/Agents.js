import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useSocket } from '../contexts/SocketContext';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Download,
  Server,
  Wifi,
  WifiOff,
  Settings,
  Terminal
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Agents = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentName, setAgentName] = useState('');
  
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  // Fetch agents
  const { data: agentsData, isLoading } = useQuery(
    'agents',
    async () => {
      const response = await axios.get('/api/agent');
      return response.data.agents;
    },
    {
      refetchInterval: 30000,
    }
  );

  // Create agent mutation
  const createAgentMutation = useMutation(
    async (data) => {
      const response = await axios.post('/api/agent', data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('agents');
        setShowCreateModal(false);
        setAgentName('');
        toast.success('Agent created successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create agent');
      }
    }
  );

  // Delete agent mutation
  const deleteAgentMutation = useMutation(
    async (agentId) => {
      const response = await axios.delete(`/api/agent/${agentId}`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('agents');
        toast.success('Agent deleted');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete agent');
      }
    }
  );

  // Regenerate token mutation
  const regenerateTokenMutation = useMutation(
    async (agentId) => {
      const response = await axios.post(`/api/agent/${agentId}/regenerate-token`);
      return response.data;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('agents');
        toast.success('Token regenerated');
        setSelectedAgent({ ...selectedAgent, token: data.token });
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to regenerate token');
      }
    }
  );

  const handleCreateAgent = (e) => {
    e.preventDefault();
    if (!agentName.trim()) {
      toast.error('Please enter an agent name');
      return;
    }
    
    createAgentMutation.mutate({ name: agentName });
  };

  const handleCopyToken = (token) => {
    navigator.clipboard.writeText(token);
    toast.success('Token copied to clipboard');
  };

  const handleCopyInstallCommand = (agent) => {
    const command = `curl -s https://tunnel.suadominio.io/install.sh | bash -s -- --token ${agent.token} --agent-id ${agent._id}`;
    navigator.clipboard.writeText(command);
    toast.success('Install command copied to clipboard');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'offline':
        return 'bg-gray-100 text-gray-800';
      case 'connecting':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-gray-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-yellow-500" />;
    }
  };

  const agents = agentsData || [];

  if (isLoading) {
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
            Agents
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your tunnel agents and install them on your machines.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Agent
          </button>
        </div>
      </div>

      {/* Agents List */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <div key={agent._id} className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Server className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">
                  {agent.name}
                </h3>
              </div>
              <div className="flex items-center">
                {getStatusIcon(agent.status)}
                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                  {agent.status}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Token</p>
                <div className="flex items-center mt-1">
                  <p className="text-sm font-mono text-gray-900 truncate flex-1">
                    {agent.token.substring(0, 20)}...
                  </p>
                  <button
                    onClick={() => handleCopyToken(agent.token)}
                    className="ml-2 text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {agent.system && (
                <div>
                  <p className="text-sm text-gray-500">System</p>
                  <p className="text-sm font-medium text-gray-900">
                    {agent.system.os} {agent.system.arch}
                  </p>
                </div>
              )}

              {agent.lastSeen && (
                <div>
                  <p className="text-sm text-gray-500">Last Seen</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(agent.lastSeen).toLocaleString()}
                  </p>
                </div>
              )}

              {agent.stats && (
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500">Uptime</p>
                    <p className="text-sm font-medium text-gray-900">
                      {Math.floor(agent.stats.uptime / 3600)}h
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Connections</p>
                    <p className="text-sm font-medium text-gray-900">
                      {agent.stats.totalConnections || 0}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setSelectedAgent(agent);
                    setShowInstallModal(true);
                  }}
                  className="btn btn-secondary"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Install
                </button>
                <button
                  onClick={() => regenerateTokenMutation.mutate(agent._id)}
                  className="btn btn-secondary"
                  disabled={regenerateTokenMutation.isLoading}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Regenerate
                </button>
              </div>

              <button
                onClick={() => deleteAgentMutation.mutate(agent._id)}
                className="text-red-400 hover:text-red-600"
                disabled={deleteAgentMutation.isLoading}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="text-center py-12">
          <Server className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No agents</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new agent.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create your first agent
            </button>
          </div>
        </div>
      )}

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreateAgent}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Create New Agent
                      </h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Agent Name
                        </label>
                        <input
                          type="text"
                          required
                          className="input mt-1"
                          value={agentName}
                          onChange={(e) => setAgentName(e.target.value)}
                          placeholder="My Agent"
                        />
                        <p className="mt-2 text-sm text-gray-500">
                          Choose a descriptive name for your agent (e.g., "My Laptop", "Production Server").
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="btn btn-primary w-full sm:w-auto sm:ml-3"
                    disabled={createAgentMutation.isLoading}
                  >
                    {createAgentMutation.isLoading ? 'Creating...' : 'Create Agent'}
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

      {/* Install Agent Modal */}
      {showInstallModal && selectedAgent && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowInstallModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Install Agent: {selectedAgent.name}
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Linux/macOS</h4>
                        <div className="bg-gray-900 text-white p-4 rounded-lg">
                          <code className="text-sm">
                            curl -s https://tunnel.suadominio.io/install.sh | bash -s -- --token {selectedAgent.token} --agent-id {selectedAgent._id}
                          </code>
                        </div>
                        <button
                          onClick={() => handleCopyInstallCommand(selectedAgent)}
                          className="mt-2 btn btn-secondary"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Command
                        </button>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Windows (PowerShell)</h4>
                        <div className="bg-gray-900 text-white p-4 rounded-lg">
                          <code className="text-sm">
                            Invoke-WebRequest -Uri "https://tunnel.suadominio.io/install.ps1" -OutFile "install.ps1"<br/>
                            .\install.ps1 --token {selectedAgent.token} --agent-id {selectedAgent._id}
                          </code>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Docker</h4>
                        <div className="bg-gray-900 text-white p-4 rounded-lg">
                          <code className="text-sm">
                            docker run -d --name tunnel-agent \<br/>
                            &nbsp;&nbsp;-e TUNNEL_TOKEN={selectedAgent.token} \<br/>
                            &nbsp;&nbsp;-e TUNNEL_AGENT_ID={selectedAgent._id} \<br/>
                            &nbsp;&nbsp;tunnel-agent:latest
                          </code>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex">
                          <Terminal className="h-5 w-5 text-blue-400 mr-2" />
                          <div>
                            <h4 className="text-sm font-medium text-blue-900">Installation Notes</h4>
                            <ul className="mt-2 text-sm text-blue-700 list-disc list-inside">
                              <li>The agent will run as a system service</li>
                              <li>It will automatically reconnect if the connection is lost</li>
                              <li>Check the status with: <code>systemctl status tunnel-agent</code></li>
                              <li>View logs with: <code>journalctl -u tunnel-agent -f</code></li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setShowInstallModal(false)}
                  className="btn btn-primary w-full sm:w-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agents;
