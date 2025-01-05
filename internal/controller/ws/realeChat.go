package ws

import (
	"context"
	"fmt"
	"log"
	"sync"

	"forum/internal/entity"

	"github.com/gorilla/websocket"
)

type Manager struct {
	Client map[int]*websocket.Conn
	Mtx sync.RWMutex
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

func (m *Manager) WriteToClient(ctx context.Context, Message entity.Message) error {
	conn := m.GetClient(Message.ReceiverID)
	if conn == nil {
		return fmt.Errorf("client %d not found", Message.ReceiverID)
	}
	m.Mtx.Lock()
	defer m.Mtx.Unlock()
	return conn.WriteJSON(Message)
}

func (m *Manager) ReadFromClient(id int) (int, []byte, error) {
	conn := m.GetClient(id)
	if conn == nil {
		return 0, nil, fmt.Errorf("client %d not found", id)
	}
	_, message, err := conn.ReadMessage()
	if err != nil {
		return 0, nil, err
	}
	return id, message, nil
}
