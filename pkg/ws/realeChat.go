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
	Client map[uint]*websocket.Conn
	Mtx sync.RWMutex
}

func NewManager() *Manager {
	return &Manager{
		Client: make(map[uint]*websocket.Conn),
		Mtx:    sync.RWMutex{},
	}
}

func (m *Manager) AddClient(key uint, conn *websocket.Conn) {
	m.Client[key] = conn
	// notify all clients that a new user has joined
	m.Broadcast(entity.Contact{
		ID:     uint(key),
		Action: "change_status",
		Status: "online",
	})
	log.Printf("client %d added", key)
}

func (m *Manager) RemoveClient(key uint) {
	m.Mtx.Lock()
	if conn, ok := m.Client[key]; ok {
		conn.Close()
		delete(m.Client, key)
	}
	m.Mtx.Unlock()
	// notify all clients that a user has left
	m.Broadcast(entity.Contact{
		ID:     uint(key),
		Action: "change_status",
		Status: "offline",
	})
	log.Printf("client %d removed", key)
}

func (m *Manager) GetClient(key uint) *websocket.Conn {
	m.Mtx.RLock()
	defer m.Mtx.RUnlock()
	return m.Client[key]
}

func (m *Manager) Broadcast(message entity.Contact) {
	m.Mtx.RLock()
	defer m.Mtx.RUnlock()
	for _, conn := range m.Client {
		err := conn.WriteJSON(message)
		if err != nil {
			log.Printf("error writing to client: %v", err)
		}
	}
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

func (m *Manager) ReadFromClient(message *entity.Message,id int,status *int){
	conn := m.GetClient(message.ReceiverID)
	if conn == nil {
		*status = 404
		return
	}	
	err := conn.ReadJSON(message)
	if err != nil {
		*status = 500
		return
	}
}
