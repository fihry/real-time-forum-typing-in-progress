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

func (m *Manager) GetonlineClients(onlineContacts *[]int){
	m.Mtx.RLock()
	defer m.Mtx.RUnlock()
	for key := range m.Client {
		*onlineContacts = append(*onlineContacts, key)
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
	*status = 200
	err := conn.ReadJSON(message)
	if err != nil {
		*status = 500
		log.Println(err)
	}
}
