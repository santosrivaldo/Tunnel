import React from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { 
  Network, 
  Server, 
  Activity, 
  TrendingUp,
  Wifi,
  WifiOff,
  Clock,
  Database
} from 'lucide-react';
import axios from 'axios';

const Dashboard = () => {
  const { user } = useAuth();
  const { connected } = useSocket();

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery(
    'dashboard',
    async () => {
      const [tunnelsRes, agentsRes] = await Promise.all([
        axios.get('/api/tunnel'),
        axios.get('/api/agent')
      ]);
      
      return {
        tunnels: tunnelsRes.data.tunnels,
        agents: agentsRes.data.agents
      };
    },
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  const tunnels = dashboardData?.tunnels || [];
  const agents = dashboardData?.agents || [];

  const activeTunnels = tunnels.filter(tunnel => tunnel.status === 'active').length;
  const onlineAgents = agents.filter(agent => agent.status === 'online').length;

  const stats = [
    {
      name: 'Active Tunnels',
      value: activeTunnels,
      total: tunnels.length,
      icon: Network,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'Online Agents',
      value: onlineAgents,
      total: agents.length,
      icon: Server,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Total Traffic',
      value: '2.4 GB',
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      name: 'Uptime',
      value: '99.9%',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

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
            Welcome back, {user?.name}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Here's what's happening with your tunnels and agents.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <div className="flex items-center space-x-2">
            {connected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm text-gray-500">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md p-3 ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </div>
                      {stat.total !== undefined && (
                        <div className="ml-2 text-sm text-gray-500">
                          / {stat.total}
                        </div>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Tunnels */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Tunnels</h3>
            <a
              href="/tunnels"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              View all
            </a>
          </div>
          <div className="space-y-3">
            {tunnels.slice(0, 5).map((tunnel) => (
              <div key={tunnel._id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-3 ${
                    tunnel.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {tunnel.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {tunnel.subdomain}.{process.env.REACT_APP_BASE_DOMAIN || 'tunnel.suadominio.io'}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  tunnel.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {tunnel.status}
                </span>
              </div>
            ))}
            {tunnels.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No tunnels yet. Create your first tunnel to get started.
              </p>
            )}
          </div>
        </div>

        {/* Recent Agents */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Agents</h3>
            <a
              href="/agents"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              View all
            </a>
          </div>
          <div className="space-y-3">
            {agents.slice(0, 5).map((agent) => (
              <div key={agent._id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-3 ${
                    agent.status === 'online' ? 'bg-green-400' : 'bg-gray-400'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {agent.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {agent.system?.os} {agent.system?.arch}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  agent.status === 'online' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {agent.status}
                </span>
              </div>
            ))}
            {agents.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No agents yet. Create your first agent to get started.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <a
            href="/tunnels/new"
            className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300"
          >
            <div>
              <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
                <Network className="h-6 w-6" />
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-medium">
                <span className="absolute inset-0" />
                Create Tunnel
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Create a new secure tunnel to expose your local services.
              </p>
            </div>
          </a>

          <a
            href="/agents/new"
            className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300"
          >
            <div>
              <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                <Server className="h-6 w-6" />
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-medium">
                <span className="absolute inset-0" />
                Add Agent
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Install a new agent on your machine to create tunnels.
              </p>
            </div>
          </a>

          <a
            href="/billing"
            className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300"
          >
            <div>
              <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
                <Database className="h-6 w-6" />
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-medium">
                <span className="absolute inset-0" />
                Manage Billing
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                View your usage and manage your subscription.
              </p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
