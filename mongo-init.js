// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

// Create database
db = db.getSiblingDB('tunnel-saas');

// Create collections with indexes
db.createCollection('users');
db.createCollection('tunnels');
db.createCollection('agents');
db.createCollection('plans');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "subscription.stripeCustomerId": 1 });
db.users.createIndex({ "subscription.stripeSubscriptionId": 1 });

db.tunnels.createIndex({ "userId": 1, "isActive": 1 });
db.tunnels.createIndex({ "subdomain": 1 }, { unique: true });
db.tunnels.createIndex({ "status": 1 });
db.tunnels.createIndex({ "agentId": 1 });

db.agents.createIndex({ "userId": 1, "isActive": 1 });
db.agents.createIndex({ "token": 1 }, { unique: true });
db.agents.createIndex({ "socketId": 1 });
db.agents.createIndex({ "status": 1 });

db.plans.createIndex({ "name": 1, "isActive": 1 });
db.plans.createIndex({ "sortOrder": 1 });

// Insert default plans
db.plans.insertMany([
  {
    name: 'free',
    displayName: 'Free',
    description: 'Perfect for getting started with basic tunnel functionality',
    price: {
      monthly: 0,
      yearly: 0
    },
    limits: {
      maxTunnels: 1,
      maxAgents: 1,
      bandwidthLimit: 1073741824, // 1GB
      customDomains: 0,
      sslCertificates: 0,
      prioritySupport: false
    },
    features: [
      { name: 'Basic Tunnels', description: 'Create up to 1 tunnel', included: true },
      { name: '1 Agent', description: 'Install 1 agent on your machine', included: true },
      { name: '1GB Bandwidth', description: '1GB of data transfer per month', included: true },
      { name: 'Community Support', description: 'Get help from our community', included: true }
    ],
    isActive: true,
    isPopular: false,
    sortOrder: 1
  },
  {
    name: 'basic',
    displayName: 'Basic',
    description: 'Great for personal projects and small teams',
    price: {
      monthly: 9,
      yearly: 90
    },
    limits: {
      maxTunnels: 5,
      maxAgents: 3,
      bandwidthLimit: 10737418240, // 10GB
      customDomains: 1,
      sslCertificates: 1,
      prioritySupport: false
    },
    features: [
      { name: '5 Tunnels', description: 'Create up to 5 tunnels', included: true },
      { name: '3 Agents', description: 'Install up to 3 agents', included: true },
      { name: '10GB Bandwidth', description: '10GB of data transfer per month', included: true },
      { name: '1 Custom Domain', description: 'Use your own domain', included: true },
      { name: 'SSL Certificate', description: 'Free SSL certificate', included: true },
      { name: 'Email Support', description: 'Get help via email', included: true }
    ],
    isActive: true,
    isPopular: true,
    sortOrder: 2
  },
  {
    name: 'pro',
    displayName: 'Pro',
    description: 'Perfect for growing businesses and development teams',
    price: {
      monthly: 29,
      yearly: 290
    },
    limits: {
      maxTunnels: 20,
      maxAgents: 10,
      bandwidthLimit: 107374182400, // 100GB
      customDomains: 5,
      sslCertificates: 5,
      prioritySupport: true
    },
    features: [
      { name: '20 Tunnels', description: 'Create up to 20 tunnels', included: true },
      { name: '10 Agents', description: 'Install up to 10 agents', included: true },
      { name: '100GB Bandwidth', description: '100GB of data transfer per month', included: true },
      { name: '5 Custom Domains', description: 'Use up to 5 custom domains', included: true },
      { name: '5 SSL Certificates', description: 'Up to 5 SSL certificates', included: true },
      { name: 'Priority Support', description: 'Get priority support', included: true },
      { name: 'Advanced Analytics', description: 'Detailed usage analytics', included: true }
    ],
    isActive: true,
    isPopular: false,
    sortOrder: 3
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    description: 'For large organizations with advanced requirements',
    price: {
      monthly: 99,
      yearly: 990
    },
    limits: {
      maxTunnels: 100,
      maxAgents: 50,
      bandwidthLimit: 1073741824000, // 1TB
      customDomains: 20,
      sslCertificates: 20,
      prioritySupport: true
    },
    features: [
      { name: '100 Tunnels', description: 'Create up to 100 tunnels', included: true },
      { name: '50 Agents', description: 'Install up to 50 agents', included: true },
      { name: '1TB Bandwidth', description: '1TB of data transfer per month', included: true },
      { name: '20 Custom Domains', description: 'Use up to 20 custom domains', included: true },
      { name: '20 SSL Certificates', description: 'Up to 20 SSL certificates', included: true },
      { name: 'Priority Support', description: 'Get priority support', included: true },
      { name: 'Advanced Analytics', description: 'Detailed usage analytics', included: true },
      { name: 'SLA Guarantee', description: '99.9% uptime guarantee', included: true },
      { name: 'Dedicated Support', description: 'Dedicated support representative', included: true }
    ],
    isActive: true,
    isPopular: false,
    sortOrder: 4
  }
]);

print('Database initialized successfully!');
