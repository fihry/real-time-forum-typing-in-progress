package ws

import (
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

type Manager struct {
	Client map[int]*websocket.Conn
	Mtx    sync.RWMutex
}

type Client struct {
	Conn *websocket.Conn
	Key  string
}

func NewManager() *Manager {
	return &Manager{
		Client: make(map[int]*websocket.Conn),
		Mtx:    sync.RWMutex{},
	}
}

func (m *Manager) AddClient(key int, conn *websocket.Conn) {
	m.Client[key] = conn
	log.Printf("client %d added", key)
}

func (m *Manager) RemoveClient(key int) {
	delete(m.Client, key)
	log.Printf("client %d removed", key)
}

func (m *Manager) GetClient(key int) *websocket.Conn {
	return m.Client[key]
}

func (m *Manager) WriteToClient(key int, message []byte) error {
	conn := m.GetClient(key)
	if conn == nil {
		return nil
	}
	m.Mtx.Lock()
	defer m.Mtx.Unlock()
	// add messge to db
	return conn.WriteMessage(websocket.TextMessage, message)
}

func (m *Manager) ReadFromClient(key int) (int, []byte, error) {
	conn := m.GetClient(key)
	if conn == nil {
		return 0, nil, nil
	}
	m.Mtx.Lock()
	defer m.Mtx.Unlock()
	return conn.ReadMessage()
}
