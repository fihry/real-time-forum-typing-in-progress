package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"forum/internal/entity"
	"forum/internal/repository"
	smpljwt "forum/pkg/smplJwt"
	"forum/pkg/ws"

	"github.com/gorilla/websocket"
)

type MessageService struct {
	*repository.Repository
	*ws.Manager
}

func newMessageService(messageRepo *repository.Repository) *MessageService {
	return &MessageService{Repository: messageRepo, Manager: ws.NewManager()}
}

func (s *MessageService) GetAllContacts(ctx context.Context, userID uint) ([]entity.Contact, int, error) {
	return s.Repository.Message.GetAllContacts(ctx, userID)
}

func (s *MessageService) CreateMessage(ctx context.Context, input entity.Message) (int, error) {
	return s.Repository.Message.CreateMessage(ctx, input)
}

func (s *MessageService) GetAllMessagesByUserID(ctx context.Context, userID uint, limit, offset int) ([]entity.Message, int, error) {
	return s.Repository.Message.GetAllMessagesByUserID(ctx, userID, limit, offset)
}

func (s *MessageService) GetAllUnreadMessagesByUserID(ctx context.Context, userID uint, limit, offset int) ([]entity.Message, int, error) {
	return s.Repository.Message.GetAllUnreadMessagesByUserID(ctx, userID, limit, offset)
}

func (s *MessageService) GetMessagesBySenderIDAndReceiverID(ctx context.Context, senderID, receiverID uint, limit, offset int) ([]entity.Message, int, error) {
	return s.Repository.Message.GetMessagesBySenderIDAndReceiverID(ctx, senderID, receiverID, limit, offset)
}

func (s MessageService) Websocket(conn *websocket.Conn, ctx context.Context, secret string) error {
	// Retrieve token from context
	token, ok := ctx.Value(s.TokenKey).(string)
	if !ok {
		return fmt.Errorf("failed to retrieve token from context, expected string but got %T", ctx.Value(s.TokenKey))
	}

	// Parse token
	id, err := smpljwt.ParseToken(token, secret)
	if err != nil {
		return fmt.Errorf("error occurred while parsing token: %v", err)
	}

	// Add client to manager
	s.Manager.AddClient(id, conn)
	defer s.Manager.RemoveClient(id)

	// Get all online contacts
  var ConstacsOrder entity.ConstacsOrder
	// var idsOnManager []int


	// s.Manager.GetonlineClients(&idsOnManager)

	// var mu sync.Mutex // Mutex to protect concurrent access to Contacts

	// for _, contact := range idsOnManager {
	// 	user, status, err := s.User.GetUserByID(ctx, contact)
	// 	if err != nil || status != http.StatusOK {
	// 		log.Printf("Error retrieving user by ID %d: %v", contact, err)
	// 		continue
	// 	}
	// 	mu.Lock()
	// 	ConstacsOrder.Contacts = append(ConstacsOrder.Contacts, user)
	// 	mu.Unlock()
	// }
	// get all contacts from the database and  add status if online or offline
	ConstacsOrder.Contacts, _, err = s.GetAllContacts(ctx, uint(id))
	if err != nil {
		log.Printf("Error getting contacts: %v", err)
		return fmt.Errorf("error occurred while getting contacts: %v", err)
	}

	for i, contact := range ConstacsOrder.Contacts {
		s.Manager.Mtx.RLock()
		_, ok := s.Manager.Client[int(contact.ID)]
		s.Manager.Mtx.RUnlock()
		if ok {
			ConstacsOrder.Contacts[i].Status = "online"
		} else {
			ConstacsOrder.Contacts[i].Status = "offline"
		}
	}

	ConstacsOrder.Action = "get_contacts"

	// Send Contacts list to the client && add action to messageInfo

  	if err := conn.WriteJSON(ConstacsOrder); err != nil {
		log.Printf("Error sending contacts to client: %v", err)
		return fmt.Errorf("error occurred while sending contacts: %v", err)
	}

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Error reading message: %v", err)
			return err // Consider if you'd want to disconnect the client or continue in this case
		}

		var messageInfo entity.Message
		messageInfo.SenderID = id
		messageInfo.CreatedAt = time.Now().Format("2006-01-02 15:04:05")
		if err := json.Unmarshal(message, &messageInfo); err != nil {
			log.Printf("Error unmarshalling message: %v", err)
			return fmt.Errorf("error occurred while unmarshalling message: %v", err)
		}

		// Handle different actions based on message
		switch messageInfo.Action {
		case "get_messages":
			var messages entity.MessagesOrder
			var status int
			messageInfo.Limit = 10
			messageInfo.Offset = 0
			messages.Messages, status, err = s.GetMessagesBySenderIDAndReceiverID(ctx, uint(messageInfo.SenderID), uint(messageInfo.ReceiverID), messageInfo.Limit, messageInfo.Offset)
			if err != nil || status != http.StatusOK {
				log.Printf("Error fetching messages: %v", err)
				return fmt.Errorf("error occurred while getting messages: %v", err)
			}
			messages.Action = "get_messages"
			if err := conn.WriteJSON(messages); err != nil {
				log.Printf("Error sending messages to client: %v", err)
				return fmt.Errorf("error occurred while sending messages: %v", err)
			}
		case "":
			status, err := s.CreateMessage(ctx, messageInfo)
			if err != nil || status != http.StatusOK {
				log.Printf("Error creating message: %v", err)
				return fmt.Errorf("error occurred while creating message: %v", err)
			}
		}

		go func() {
			if err := s.Manager.WriteToClient(ctx, messageInfo); err != nil {
				log.Printf("Error writing to client: %v", err)
			}
		}()
	}
}