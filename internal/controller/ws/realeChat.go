package ws

import (
	"github.com/gorilla/websocket"
)

type Manager struct {
	Client map[string]*websocket.Conn
}

type Client struct {
	Conn *websocket.Conn
}

func NewManager() *Manager {
	return &Manager{
		Client: make(map[string]*websocket.Conn),
	}
}

func (m *Manager) AddClient(key string, conn *websocket.Conn) {
	m.Client[key] = conn
}

func (m *Manager) RemoveClient(key string) {
	delete(m.Client, key)
}

func (m *Manager) GetClient(key string) *websocket.Conn {
	return m.Client[key]
}

func (m *Manager) Broadcast(message []byte) {
	for _, client := range m.Client {
		client.WriteMessage(websocket.TextMessage, message)
	}
}
