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

func (s *MessageService) GetContactsthasNotMessage(ctx context.Context, userID uint, limit, offset int) ([]entity.Contact, error) {
	return s.Repository.Message.GetContactsthasNotMessage(ctx, userID, limit, offset)
}

func (s *MessageService) GetContactsOrderedByLastMessage(ctx context.Context, userID uint, limit, offset int) ([]entity.Contact, error) {
	return s.Repository.Message.GetContactsOrderedByLastMessage(ctx, userID, limit, offset)
}

func (s *MessageService) GetAllContacts(ctx context.Context, userID uint) ([]entity.Contact, int, error) {
	return s.Repository.Message.GetAllContacts(ctx, userID)
}

func (s *MessageService) CreateMessage(ctx context.Context, input entity.Message) (int, error) {
	return s.Repository.Message.CreateMessage(ctx, input)
}

func (s *MessageService) GetMessagesBySenderIDAndReceiverID(ctx context.Context, senderID, receiverID uint, limit, offset int) ([]entity.Message, int, error) {
	return s.Repository.Message.GetMessagesBySenderIDAndReceiverID(ctx, senderID, receiverID, limit, offset)
}

func (s *MessageService) Websocket(conn *websocket.Conn, ctx context.Context, secret string) error {
	// Retrieve token from context
	id, ok := ctx.Value(s.IDKey).(int)
	if !ok {
		return fmt.Errorf("invalid user ID in context")
	}
	log.Printf("User with ID %d connected", id)

	// Add client to manager
	s.Manager.AddClient(id, conn)
	defer s.Manager.RemoveClient(id)

	// Get all contacts from the database and add status if online or offline

	contactsOrder, err := getContacts(ctx, s, id, conn)
	if err != nil {
		log.Printf("Error getting contacts: %v", err)
	}

	// Send contacts list to the client
	if err := conn.WriteJSON(contactsOrder); err != nil {
		log.Printf("Error sending contacts to client: %v", err)
		return fmt.Errorf("error occurred while sending contacts: %v", err)
	}

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Error reading message: %v", err)
			return err
		}

		var messageInfo entity.Message
		messageInfo.SenderID = id
		messageInfo.CreatedAt = time.Now().Format("2006-01-02 15:04:05")
		if err := json.Unmarshal(message, &messageInfo); err != nil {
			log.Printf("Error unmarshalling message: %v", err)
			return fmt.Errorf("error occurred while unmarshalling message: %v", err)
		}
		log.Printf("Message: %v", messageInfo)
		switch messageInfo.Action {
		case "get_messages":
			messages, status, err := s.GetMessagesBySenderIDAndReceiverID(ctx, uint(messageInfo.SenderID), uint(messageInfo.ReceiverID), 40, 0)
			if err != nil || status != http.StatusOK {
				log.Printf("Error fetching messages: %v", err)
				return fmt.Errorf("error occurred while getting messages: %v", err)
			}
			messagesOrder := entity.MessagesOrder{
				Action:   "get_messages",
				Messages: messages,
			}
			if err := conn.WriteJSON(messagesOrder); err != nil {
				log.Printf("Error sending messages to client: %v", err)
				return fmt.Errorf("error occurred while sending messages: %v", err)
			}
		case "new_message":
			// Save the message to the database
			status, err := s.CreateMessage(ctx, messageInfo)
			if err != nil || status != http.StatusCreated {
				log.Printf("Error creating message: %v", err)
				return fmt.Errorf("error occurred while creating message: %v", err)
			}

			// Notify the receiver (if online)
			go func() {
				if err := s.Manager.WriteToClient(ctx, messageInfo); err != nil {
					log.Printf("Error writing message to client: %v", err)
				}
			}()
		case "ping":
			
			// send the new if some client changes the status
			go func() {
				contactsOrder, err := getContacts(ctx, s, id, conn)
				if err != nil {
					log.Printf("Error getting contacts: %v", err)
				}
				if err := conn.WriteJSON(contactsOrder); err != nil {
					log.Printf("Error sending contacts to client: %v", err)
				}
			}()

		default:
			log.Printf("Unknown action: %v", messageInfo.Action)
		}
	}
}

func getContacts(ctx context.Context, s *MessageService, id int, conn *websocket.Conn) ([]entity.Contact, error) {
	contacts, _, err := s.GetAllContacts(ctx, uint(id))
	if err != nil {
		log.Printf("Error getting contacts: %v", err)
		return nil, err
	}
	for i, contact := range contacts {
		s.Manager.Mtx.RLock()
		online := s.Manager.GetClient(int(contact.ID)) != nil
		s.Manager.Mtx.RUnlock()
		if online {
			contacts[i].Status = "online"
		} else {
			contacts[i].Status = "offline"
		}
	}
	contactsOrder := entity.ConstacsOrder{
		Action:   "get_contacts",
		Contacts: contacts,
	}
	if err := conn.WriteJSON(contactsOrder); err != nil {
		log.Printf("Error sending contacts to client: %v", err)
	}
	return contacts, nil
}
