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
	Client map[uint][]*websocket.Conn
	Mtx sync.RWMutex
}

func NewManager() *Manager {
	return &Manager{
		Client: make(map[uint][]*websocket.Conn),
		Mtx:    sync.RWMutex{},
	}
}

func (m *Manager) AddClient(key uint, conn *websocket.Conn) {
	m.Mtx.Lock()
	if _, ok:= m.Client[key]; !ok {
		m.Client[key] = []*websocket.Conn{}
	}
	m.Client[key] = append(m.Client[key], conn)
	m.Mtx.Unlock()
	// notify all clients that a new user has joined
	m.Broadcast(entity.Contact{
		ID:     uint(key),
		Action: "change_status",
		Status: "online",
	})
	log.Printf("client %d added, we have %d connections", key, len(m.Client[key]))
}

//loop in remove the connection from the array and if length of m.Client[key] == 0, remove key
func (m *Manager) RemoveClient(key uint, conn *websocket.Conn) {
	if conns, ok := m.Client[key]; ok {
		for i:= 0; i < len(conns); i++ {
			if conns[i] == conn {
				m.Mtx.Lock()
				conns = append(conns[:i], conns[i+1:]...)
				if len(conns) == 0 {
					log.Printf("client %d removed\n", key)
					delete(m.Client, key)

					// notify all clients that a user has left
					m.Broadcast(entity.Contact{
						ID:     uint(key),
						Action: "change_status",
						Status: "offline",
					})
				}
				m.Client[key] = conns
				m.Mtx.Unlock()
                break
            }
    	}
	}
	
}

func (m *Manager) GetClient(key uint) []*websocket.Conn {
	return m.Client[key]
}

func (m *Manager) IsClientConnected(key uint) bool {
	return m.Client[key] != nil && len(m.Client[key]) > 0  
} 

func (m *Manager) Broadcast(message entity.Contact) {
	for id, conns := range m.Client {
		for _, conn:= range conns {
			if id == message.ID {
				continue
			}
			err := conn.WriteJSON(message)
			if err != nil {
				log.Printf("error: %v", err)
			}
		}
	}
}

func (m *Manager) WriteToClient(ctx context.Context, Message entity.Message) error {
	conns := m.GetClient(Message.ReceiverID)
	if conns == nil || len(conns) == 0 {
		return fmt.Errorf("client %d not found", Message.ReceiverID)
	}
	if (Message.ReceiverID == Message.SenderID) {
		return fmt.Errorf("client %d cannot send message to self", Message.ReceiverID	)
	}
	m.Mtx.Lock()
	defer m.Mtx.Unlock()
	for _, conn := range conns {
		err:= conn.WriteJSON(Message)
		if err!= nil {
            log.Printf("error: %v", err)
            return err
        }
	}
	return nil
}

func (m *Manager) ReadFromClient(message *entity.Message,id int,status *int){
	conns := m.GetClient(message.ReceiverID)
	if conns == nil || len(conns) == 0 {
		*status = 404
		return
	}	
	for _, conn := range conns {
		err := conn.ReadJSON(message)
		if err != nil {
			*status = 500
			return
		}
	}

}
