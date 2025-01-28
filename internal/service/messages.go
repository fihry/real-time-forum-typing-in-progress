package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

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

	// Add client to manager
	go s.Manager.AddClient(uint(id), conn)
	defer s.Manager.RemoveClient(uint(id))


	var user entity.Contact
	user, _, err := s.GetUserByID(ctx, uint(id))
	if err != nil {
		log.Printf("Error getting user: %v", err)
		return fmt.Errorf("error occurred while getting user: %v", err)
	}
  // Update user status to online
	user.Status = "online"
	user.Action = "get_user"

	// Start the loop to read messages
	defer conn.Close()
	if err := messagessHandller(s, conn, ctx, user); err != nil {
		return fmt.Errorf("error occurred while handling messages: %v", err)
	}
	return nil
}

func messagessHandller( s *MessageService, conn *websocket.Conn, ctx context.Context, user entity.Contact) error {
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Error reading message: %v", err)
			return err
		}
		
		var messageInfo entity.Message
		messageInfo.SenderID = user.ID
		if err := json.Unmarshal(message, &messageInfo); err != nil {
			log.Printf("Error unmarshalling message: %v", err)
			return fmt.Errorf("error occurred while unmarshalling message: %v", err)
		}

		switch messageInfo.Action {
		case "get_messages":
			log.Println("Fetching messages" + messageInfo.Action + " " + fmt.Sprint(messageInfo.Limit) + " " + fmt.Sprint(messageInfo.Offset))
			// Fetch messages by sender and receiver ID
			messages, status, err := s.GetMessagesBySenderIDAndReceiverID(ctx, uint(messageInfo.SenderID), uint(messageInfo.ReceiverID), messageInfo.Limit, messageInfo.Offset)
			if err != nil {
				return fmt.Errorf("error occurred while getting messages: %v", err)
			}
			if status == http.StatusNotFound {
				conn.WriteJSON(entity.MessagesOrder{
					Action: "get_messages",
					Status: http.StatusNotFound,
					Messages: []entity.Message{},
				})
				continue
			}

			// Send messages to the client
			messagesOrder := entity.MessagesOrder{
				Action:   "get_messages",
				Messages: messages,
			}
			log.Printf("Sending messages to client: %v", len(messagesOrder.Messages))
			if err := conn.WriteJSON(messagesOrder); err != nil {
				log.Printf("Error sending messages to client: %v", err)
				return fmt.Errorf("error occurred while sending messages: %v", err)
			}
		case "get_user":
			// Send user info to the client
			if err := conn.WriteJSON(user); err != nil {
				log.Printf("Error sending user to client: %v", err)
				return fmt.Errorf("error occurred while sending user: %v", err)
			}
			log.Printf("Sent user info to client: %v", user)
		case "get_contacts":
			// Fetch and send contacts
			contactsOrder,status, err := getContacts(ctx, s, user.ID)
			if err != nil || status != http.StatusOK {
				return fmt.Errorf("error occurred while getting contacts: %v", err)
			}
      if err := conn.WriteJSON(contactsOrder); err != nil {
        log.Printf("Error sending contacts to client: %v", err)
        return fmt.Errorf("error occurred while sending contacts: %v", err)
      }
		case "new_message":
			// check message are not empty
			if messageInfo.Message == "" {
				log.Printf("Error: message is empty")
				return fmt.Errorf("error occurred while creating message: message is empty")
			}
			// Save the new message to the database
			status, err := s.CreateMessage(ctx, messageInfo)
			if err != nil || status != http.StatusCreated {
				log.Printf("Error creating message: %v", err)
				return fmt.Errorf("error occurred while creating message: %v", err)
			}

			// Notify the receiver (if online)
			contact ,_, err := s.GetUserByID(ctx, uint(messageInfo.SenderID))
			if err != nil {
				log.Printf("Error getting user: %v", err)
				return fmt.Errorf("error occurred while getting user: %v", err)
			}
			messageInfo.Nickname = contact.Nickname
			messageInfo.Action = "new_message"
			log.Printf("Sending message to receiver: %v", messageInfo)
			// Write the message to the receiver
			go func() {
				if err := s.Manager.WriteToClient(ctx, messageInfo); err != nil {
					log.Printf("Error writing message to client: %v", err)
				}
			}()
		default:
			log.Printf("Unknown action: %v", messageInfo.Action)
		}
	}
}

func getContacts(ctx context.Context, s *MessageService, id uint) (entity.ConstacsOrder,int, error) {
	// Retrieve contacts that have had recent communication
	contacts, status, err := s.GetAllContacts(ctx, uint(id))
	if err != nil || status != http.StatusOK {
		return entity.ConstacsOrder{}, http.StatusInternalServerError, err
	}
	
	// Add online/offline status for each contact
	for i, contact := range contacts {
		if contact.ID == ctx.Value(s.IDKey).(uint) {
			continue
		}
		s.Manager.Mtx.RLock()
		online := s.Manager.GetClient(contact.ID) != nil
		s.Manager.Mtx.RUnlock()
		if online {
			contacts[i].Status = "online"
		} else {
			contacts[i].Status = "offline"
		}
	}

	// Return the contacts list
	contactsOrder := entity.ConstacsOrder{
		Action:   "get_contacts",
		Contacts: contacts,
	}
	return contactsOrder, http.StatusOK, nil
}
