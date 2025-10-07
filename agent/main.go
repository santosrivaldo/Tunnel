package main

import (
	"bufio"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/gorilla/websocket"
	"golang.org/x/net/proxy"
)

type Config struct {
	ServerURL    string `json:"server_url"`
	Token        string `json:"token"`
	AgentID      string `json:"agent_id"`
	AutoReconnect bool  `json:"auto_reconnect"`
	HeartbeatInterval int `json:"heartbeat_interval"`
	MaxReconnectAttempts int `json:"max_reconnect_attempts"`
	ReconnectDelay int `json:"reconnect_delay"`
}

type Agent struct {
	config     Config
	conn       *websocket.Conn
	ctx        context.Context
	cancel     context.CancelFunc
	mu         sync.RWMutex
	connected  bool
	reconnectAttempts int
	tunnels    map[string]*Tunnel
}

type Tunnel struct {
	ID         string `json:"id"`
	Subdomain  string `json:"subdomain"`
	Type       string `json:"type"`
	LocalPort  int    `json:"local_port"`
	LocalHost  string `json:"local_host"`
	PublicURL  string `json:"public_url"`
	Status     string `json:"status"`
	conn       net.Conn
	proxy      *http.Server
}

type Message struct {
	Type    string      `json:"type"`
	Data    interface{} `json:"data"`
	TunnelID string    `json:"tunnel_id,omitempty"`
}

type TunnelData struct {
	Type    string `json:"type"`
	Payload []byte `json:"payload"`
}

func main() {
	// Load configuration
	config, err := loadConfig()
	if err != nil {
		log.Fatal("Failed to load config:", err)
	}

	// Create agent
	agent := &Agent{
		config:  config,
		tunnels: make(map[string]*Tunnel),
	}

	// Start agent
	if err := agent.Start(); err != nil {
		log.Fatal("Failed to start agent:", err)
	}

	// Wait for interrupt signal
	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, os.Interrupt, syscall.SIGTERM)
	<-interrupt

	// Shutdown agent
	agent.Stop()
}

func loadConfig() (Config, error) {
	config := Config{
		ServerURL:           "wss://tunnel.suadominio.io/ws",
		AutoReconnect:       true,
		HeartbeatInterval:   30000,
		MaxReconnectAttempts: 5,
		ReconnectDelay:      5000,
	}

	// Load from environment variables
	if serverURL := os.Getenv("TUNNEL_SERVER_URL"); serverURL != "" {
		config.ServerURL = serverURL
	}
	if token := os.Getenv("TUNNEL_TOKEN"); token != "" {
		config.Token = token
	}
	if agentID := os.Getenv("TUNNEL_AGENT_ID"); agentID != "" {
		config.AgentID = agentID
	}

	// Load from config file if exists
	if _, err := os.Stat("config.json"); err == nil {
		file, err := os.Open("config.json")
		if err != nil {
			return config, err
		}
		defer file.Close()

		decoder := json.NewDecoder(file)
		if err := decoder.Decode(&config); err != nil {
			return config, err
		}
	}

	// Validate required fields
	if config.Token == "" {
		return config, fmt.Errorf("TUNNEL_TOKEN is required")
	}
	if config.AgentID == "" {
		return config, fmt.Errorf("TUNNEL_AGENT_ID is required")
	}

	return config, nil
}

func (a *Agent) Start() error {
	a.ctx, a.cancel = context.WithCancel(context.Background())

	// Start connection loop
	go a.connectionLoop()

	// Start heartbeat
	go a.heartbeatLoop()

	return nil
}

func (a *Agent) Stop() {
	a.cancel()
	if a.conn != nil {
		a.conn.Close()
	}
}

func (a *Agent) connectionLoop() {
	for {
		select {
		case <-a.ctx.Done():
			return
		default:
			if err := a.connect(); err != nil {
				log.Printf("Connection failed: %v", err)
				
				if a.config.AutoReconnect && a.reconnectAttempts < a.config.MaxReconnectAttempts {
					a.reconnectAttempts++
					log.Printf("Reconnecting in %d seconds... (attempt %d/%d)", 
						a.config.ReconnectDelay/1000, a.reconnectAttempts, a.config.MaxReconnectAttempts)
					
					time.Sleep(time.Duration(a.config.ReconnectDelay) * time.Millisecond)
					continue
				} else {
					log.Fatal("Max reconnection attempts reached")
				}
			}
		}
	}
}

func (a *Agent) connect() error {
	// Parse server URL
	u, err := url.Parse(a.config.ServerURL)
	if err != nil {
		return fmt.Errorf("invalid server URL: %v", err)
	}

	// Set up WebSocket connection
	dialer := websocket.Dialer{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: false},
		HandshakeTimeout: 10 * time.Second,
	}

	conn, _, err := dialer.Dial(u.String(), nil)
	if err != nil {
		return fmt.Errorf("failed to connect: %v", err)
	}

	a.mu.Lock()
	a.conn = conn
	a.connected = true
	a.reconnectAttempts = 0
	a.mu.Unlock()

	log.Println("Connected to tunnel server")

	// Register agent
	if err := a.register(); err != nil {
		conn.Close()
		return fmt.Errorf("failed to register: %v", err)
	}

	// Start message handler
	go a.handleMessages()

	// Wait for connection to close
	<-a.ctx.Done()
	conn.Close()
	
	a.mu.Lock()
	a.connected = false
	a.mu.Unlock()

	return nil
}

func (a *Agent) register() error {
	system := map[string]string{
		"os":        "linux", // This would be detected in a real implementation
		"arch":      "amd64",
		"platform":  "linux",
		"version":   "1.0.0",
		"hostname":  getHostname(),
	}

	network := map[string]string{
		"ip":        getLocalIP(),
		"userAgent": "Tunnel-Agent/1.0.0",
	}

	message := Message{
		Type: "agent:register",
		Data: map[string]interface{}{
			"token":   a.config.Token,
			"system":  system,
			"network": network,
		},
	}

	return a.sendMessage(message)
}

func (a *Agent) sendMessage(msg Message) error {
	a.mu.RLock()
	conn := a.conn
	a.mu.RUnlock()

	if conn == nil {
		return fmt.Errorf("not connected")
	}

	return conn.WriteJSON(msg)
}

func (a *Agent) handleMessages() {
	for {
		select {
		case <-a.ctx.Done():
			return
		default:
			var msg Message
			if err := a.conn.ReadJSON(&msg); err != nil {
				log.Printf("Failed to read message: %v", err)
				return
			}

			if err := a.processMessage(msg); err != nil {
				log.Printf("Failed to process message: %v", err)
			}
		}
	}
}

func (a *Agent) processMessage(msg Message) error {
	switch msg.Type {
	case "agent:registered":
		log.Println("Agent registered successfully")
		return nil

	case "agent:error":
		log.Printf("Agent error: %v", msg.Data)
		return nil

	case "tunnel:start":
		return a.startTunnel(msg)

	case "tunnel:stop":
		return a.stopTunnel(msg)

	case "tunnel:forward":
		return a.forwardTunnelData(msg)

	case "heartbeat:ack":
		return nil

	case "agent:command":
		return a.handleCommand(msg)

	default:
		log.Printf("Unknown message type: %s", msg.Type)
		return nil
	}
}

func (a *Agent) startTunnel(msg Message) error {
	data, ok := msg.Data.(map[string]interface{})
	if !ok {
		return fmt.Errorf("invalid tunnel data")
	}

	tunnelID, _ := data["tunnelId"].(string)
	subdomain, _ := data["subdomain"].(string)
	tunnelType, _ := data["type"].(string)
	localPort, _ := data["localPort"].(float64)
	localHost, _ := data["localHost"].(string)

	tunnel := &Tunnel{
		ID:        tunnelID,
		Subdomain: subdomain,
		Type:      tunnelType,
		LocalPort: int(localPort),
		LocalHost: localHost,
		Status:    "connecting",
	}

	a.mu.Lock()
	a.tunnels[tunnelID] = tunnel
	a.mu.Unlock()

	// Start tunnel based on type
	switch tunnelType {
	case "http", "https":
		return a.startHTTPTunnel(tunnel)
	case "tcp":
		return a.startTCPTunnel(tunnel)
	default:
		return fmt.Errorf("unsupported tunnel type: %s", tunnelType)
	}
}

func (a *Agent) startHTTPTunnel(tunnel *Tunnel) error {
	// Create HTTP proxy server
	proxy := &http.Server{
		Addr: fmt.Sprintf(":%d", tunnel.LocalPort),
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Forward request to tunnel server
			a.forwardHTTPRequest(tunnel, w, r)
		}),
	}

	tunnel.proxy = proxy

	// Start proxy server
	go func() {
		if err := proxy.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("HTTP tunnel error: %v", err)
		}
	}()

	tunnel.Status = "active"
	log.Printf("HTTP tunnel started: %s -> %s:%d", tunnel.Subdomain, tunnel.LocalHost, tunnel.LocalPort)

	return nil
}

func (a *Agent) startTCPTunnel(tunnel *Tunnel) error {
	// Create TCP listener
	listener, err := net.Listen("tcp", fmt.Sprintf(":%d", tunnel.LocalPort))
	if err != nil {
		return fmt.Errorf("failed to create TCP listener: %v", err)
	}

	tunnel.conn = listener

	// Start TCP proxy
	go func() {
		defer listener.Close()
		
		for {
			conn, err := listener.Accept()
			if err != nil {
				log.Printf("TCP tunnel accept error: %v", err)
				return
			}

			go a.handleTCPConnection(tunnel, conn)
		}
	}()

	tunnel.Status = "active"
	log.Printf("TCP tunnel started: %s -> %s:%d", tunnel.Subdomain, tunnel.LocalHost, tunnel.LocalPort)

	return nil
}

func (a *Agent) stopTunnel(msg Message) error {
	data, ok := msg.Data.(map[string]interface{})
	if !ok {
		return fmt.Errorf("invalid tunnel data")
	}

	tunnelID, _ := data["tunnelId"].(string)

	a.mu.Lock()
	tunnel, exists := a.tunnels[tunnelID]
	if exists {
		tunnel.Status = "inactive"
		
		if tunnel.proxy != nil {
			tunnel.proxy.Close()
		}
		if tunnel.conn != nil {
			tunnel.conn.Close()
		}
		
		delete(a.tunnels, tunnelID)
	}
	a.mu.Unlock()

	log.Printf("Tunnel stopped: %s", tunnelID)
	return nil
}

func (a *Agent) forwardHTTPRequest(tunnel *Tunnel, w http.ResponseWriter, r *http.Request) {
	// Create request data
	reqData := map[string]interface{}{
		"method":  r.Method,
		"url":     r.URL.String(),
		"headers": r.Header,
		"body":    r.Body,
	}

	// Send to tunnel server
	message := Message{
		Type:      "tunnel:data",
		TunnelID:  tunnel.ID,
		Data: TunnelData{
			Type:    "request",
			Payload: []byte(fmt.Sprintf("%v", reqData)),
		},
	}

	if err := a.sendMessage(message); err != nil {
		http.Error(w, "Tunnel error", http.StatusInternalServerError)
		return
	}

	// For now, just return a simple response
	// In a real implementation, you'd wait for the response from the tunnel server
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Tunnel response"))
}

func (a *Agent) handleTCPConnection(tunnel *Tunnel, conn net.Conn) {
	defer conn.Close()

	// Forward data to tunnel server
	// This is a simplified implementation
	buffer := make([]byte, 4096)
	for {
		n, err := conn.Read(buffer)
		if err != nil {
			if err != io.EOF {
				log.Printf("TCP read error: %v", err)
			}
			break
		}

		// Send data to tunnel server
		message := Message{
			Type:      "tunnel:data",
			TunnelID:  tunnel.ID,
			Data: TunnelData{
				Type:    "data",
				Payload: buffer[:n],
			},
		}

		if err := a.sendMessage(message); err != nil {
			log.Printf("Failed to send TCP data: %v", err)
			break
		}
	}
}

func (a *Agent) forwardTunnelData(msg Message) error {
	// Handle data from tunnel server
	// This would forward data to the local service
	log.Printf("Received tunnel data for tunnel %s", msg.TunnelID)
	return nil
}

func (a *Agent) handleCommand(msg Message) error {
	data, ok := msg.Data.(map[string]interface{})
	if !ok {
		return fmt.Errorf("invalid command data")
	}

	command, _ := data["command"].(string)
	
	switch command {
	case "ping":
		return a.sendMessage(Message{
			Type: "agent:pong",
			Data: map[string]interface{}{
				"timestamp": time.Now().Unix(),
			},
		})
	case "status":
		return a.sendStatus()
	default:
		log.Printf("Unknown command: %s", command)
		return nil
	}
}

func (a *Agent) sendStatus() error {
	a.mu.RLock()
	tunnels := make([]*Tunnel, 0, len(a.tunnels))
	for _, tunnel := range a.tunnels {
		tunnels = append(tunnels, tunnel)
	}
	a.mu.RUnlock()

	return a.sendMessage(Message{
		Type: "agent:status",
		Data: map[string]interface{}{
			"tunnels": tunnels,
			"uptime":  time.Since(time.Now()).Seconds(), // This would be actual uptime
		},
	})
}

func (a *Agent) heartbeatLoop() {
	ticker := time.NewTicker(time.Duration(a.config.HeartbeatInterval) * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-a.ctx.Done():
			return
		case <-ticker.C:
			if err := a.sendMessage(Message{Type: "heartbeat"}); err != nil {
				log.Printf("Failed to send heartbeat: %v", err)
			}
		}
	}
}

// Helper functions
func getHostname() string {
	hostname, err := os.Hostname()
	if err != nil {
		return "unknown"
	}
	return hostname
}

func getLocalIP() string {
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		return "unknown"
	}
	defer conn.Close()
	
	localAddr := conn.LocalAddr().(*net.UDPAddr)
	return localAddr.IP.String()
}
