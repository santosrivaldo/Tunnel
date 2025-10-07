import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  CreditCard, 
  Check, 
  X, 
  Star,
  Zap,
  Shield,
  Users,
  Globe
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Billing = () => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch user data
  const { data: userData } = useQuery(
    'user',
    async () => {
      const response = await axios.get('/api/auth/me');
      return response.data.user;
    }
  );

  // Fetch plans
  const { data: plansData, isLoading: plansLoading } = useQuery(
    'plans',
    async () => {
      const response = await axios.get('/api/billing/plans');
      return response.data.plans;
    }
  );

  // Fetch subscription
  const { data: subscriptionData } = useQuery(
    'subscription',
    async () => {
      const response = await axios.get('/api/billing/subscription');
      return response.data.subscription;
    }
  );

  // Fetch invoices
  const { data: invoicesData } = useQuery(
    'invoices',
    async () => {
      const response = await axios.get('/api/billing/invoices');
      return response.data.invoices;
    }
  );

  // Update subscription mutation
  const updateSubscriptionMutation = useMutation(
    async (planId) => {
      const response = await axios.put('/api/billing/subscription', { planId });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('subscription');
        queryClient.invalidateQueries('user');
        setShowUpgradeModal(false);
        toast.success('Subscription updated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update subscription');
      }
    }
  );

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation(
    async () => {
      const response = await axios.delete('/api/billing/subscription');
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('subscription');
        queryClient.invalidateQueries('user');
        toast.success('Subscription canceled');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to cancel subscription');
      }
    }
  );

  const handleUpgrade = (plan) => {
    setSelectedPlan(plan);
    setShowUpgradeModal(true);
  };

  const handleConfirmUpgrade = () => {
    if (selectedPlan) {
      updateSubscriptionMutation.mutate(selectedPlan._id);
    }
  };

  const getPlanIcon = (planName) => {
    switch (planName) {
      case 'free':
        return <Users className="h-6 w-6" />;
      case 'basic':
        return <Zap className="h-6 w-6" />;
      case 'pro':
        return <Star className="h-6 w-6" />;
      case 'enterprise':
        return <Shield className="h-6 w-6" />;
      default:
        return <CreditCard className="h-6 w-6" />;
    }
  };

  const getPlanColor = (planName) => {
    switch (planName) {
      case 'free':
        return 'text-gray-600';
      case 'basic':
        return 'text-blue-600';
      case 'pro':
        return 'text-purple-600';
      case 'enterprise':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const user = userData;
  const plans = plansData || [];
  const subscription = subscriptionData;
  const invoices = invoicesData || [];

  if (plansLoading) {
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
            Billing & Plans
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your subscription and billing information.
          </p>
        </div>
      </div>

      {/* Current Plan */}
      {user && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg bg-gray-100 ${getPlanColor(user.plan)}`}>
                {getPlanIcon(user.plan)}
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Current Plan: {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                </h3>
                <p className="text-sm text-gray-500">
                  {user.plan === 'free' ? 'Free tier with limited features' : 'Active subscription'}
                </p>
              </div>
            </div>
            {user.plan !== 'free' && (
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => cancelSubscriptionMutation.mutate()}
                  className="btn btn-danger"
                  disabled={cancelSubscriptionMutation.isLoading}
                >
                  Cancel Subscription
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Usage Stats */}
      {user && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Globe className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Tunnels Used
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {user.usage.totalTunnels} / {user.limits.maxTunnels}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Agents Used
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {user.usage.totalAgents} / {user.limits.maxAgents}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Zap className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Bandwidth Used
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {Math.round(user.usage.bandwidthUsed / 1024 / 1024)} MB
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Available Plans</h3>
        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan._id}
              className={`card relative ${
                plan.isPopular ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg bg-gray-100 ${getPlanColor(plan.name)}`}>
                    {getPlanIcon(plan.name)}
                  </div>
                  <div className="ml-3">
                    <h4 className="text-lg font-medium text-gray-900">
                      {plan.displayName}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {plan.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-gray-900">
                    ${plan.price.monthly}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">/month</span>
                </div>
                <div className="text-sm text-gray-500">
                  ${plan.price.yearly}/year (save {plan.yearlyDiscount}%)
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-sm text-gray-900">
                    {plan.limits.maxTunnels} Tunnels
                  </span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-sm text-gray-900">
                    {plan.limits.maxAgents} Agents
                  </span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-sm text-gray-900">
                    {Math.round(plan.limits.bandwidthLimit / 1024 / 1024 / 1024)} GB Bandwidth
                  </span>
                </div>
                {plan.limits.customDomains > 0 && (
                  <div className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-sm text-gray-900">
                      {plan.limits.customDomains} Custom Domains
                    </span>
                  </div>
                )}
                {plan.limits.sslCertificates > 0 && (
                  <div className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-sm text-gray-900">
                      {plan.limits.sslCertificates} SSL Certificates
                    </span>
                  </div>
                )}
                {plan.limits.prioritySupport && (
                  <div className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-sm text-gray-900">
                      Priority Support
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleUpgrade(plan)}
                className={`w-full btn ${
                  plan.name === user?.plan 
                    ? 'btn-secondary' 
                    : 'btn-primary'
                }`}
                disabled={plan.name === user?.plan}
              >
                {plan.name === user?.plan ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Invoices */}
      {invoices.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Invoices</h3>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.slice(0, 5).map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(invoice.created * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(invoice.amount_paid / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        invoice.status === 'paid' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <a
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-500"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && selectedPlan && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowUpgradeModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Upgrade to {selectedPlan.displayName}
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Monthly Price</span>
                        <span className="text-lg font-medium text-gray-900">
                          ${selectedPlan.price.monthly}/month
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Yearly Price</span>
                        <span className="text-lg font-medium text-gray-900">
                          ${selectedPlan.price.yearly}/year
                        </span>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">What you get:</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• {selectedPlan.limits.maxTunnels} Tunnels</li>
                          <li>• {selectedPlan.limits.maxAgents} Agents</li>
                          <li>• {Math.round(selectedPlan.limits.bandwidthLimit / 1024 / 1024 / 1024)} GB Bandwidth</li>
                          {selectedPlan.limits.customDomains > 0 && (
                            <li>• {selectedPlan.limits.customDomains} Custom Domains</li>
                          )}
                          {selectedPlan.limits.sslCertificates > 0 && (
                            <li>• {selectedPlan.limits.sslCertificates} SSL Certificates</li>
                          )}
                          {selectedPlan.limits.prioritySupport && (
                            <li>• Priority Support</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleConfirmUpgrade}
                  className="btn btn-primary w-full sm:w-auto sm:ml-3"
                  disabled={updateSubscriptionMutation.isLoading}
                >
                  {updateSubscriptionMutation.isLoading ? 'Upgrading...' : 'Confirm Upgrade'}
                </button>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="btn btn-secondary w-full sm:w-auto mt-3 sm:mt-0"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
