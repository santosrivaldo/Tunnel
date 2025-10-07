import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Determine the correct protocol and URL based on current location
      const isHttps = window.location.protocol === 'https:';
      const currentHost = window.location.hostname;
      
      let serverUrl;
      if (process.env.REACT_APP_SERVER_URL) {
        serverUrl = process.env.REACT_APP_SERVER_URL;
      } else if (isHttps) {
        // Use HTTPS for production
        serverUrl = `https://api.${currentHost}`;
      } else {
        // Use HTTP for development
        serverUrl = 'http://localhost:3001';
      }
      
      console.log('Connecting to WebSocket:', serverUrl);
      
      const newSocket = io(serverUrl, {
        auth: {
          token: localStorage.getItem('token')
        },
        autoConnect: true,
        secure: isHttps,
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnected(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
      }
    }
  }, [isAuthenticated, user]);

  const value = {
    socket,
    connected
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
