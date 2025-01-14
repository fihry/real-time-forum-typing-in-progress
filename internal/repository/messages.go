package repository

import (
	"context"
	"database/sql"
	"log"
	"net/http"

	"forum/internal/entity"
)

type messageRepo struct {
	Db *sql.DB
}

func newMessageRepository(db *sql.DB) *messageRepo {
	return &messageRepo{Db: db}
}

func (r *messageRepo) GetAllContacts(ctx context.Context, userID uint) ([]entity.Contact, int, error) {
	query := `SELECT id , nickname  FROM users WHERE id IN (SELECT DISTINCT sender_id FROM messages WHERE receiver_id = $1) OR id IN (SELECT DISTINCT receiver_id FROM messages WHERE sender_id = $1);`
	prep, err := r.Db.PrepareContext(ctx, query)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}

	defer prep.Close()

	rows, err := prep.QueryContext(ctx, userID)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	defer rows.Close()

	var Contacts []entity.Contact
	for rows.Next() {
		var contact entity.Contact
		if err = rows.Scan(&contact.ID, &contact.Nickname); err != nil {
			return nil, http.StatusInternalServerError, err
		}
		Contacts = append(Contacts, contact)
	}
	return Contacts, http.StatusOK, nil
}

func (r *messageRepo) CreateMessage(ctx context.Context, input entity.Message) (int, error) {
	log.Println(input)
	query := `INSERT INTO messages(sender_id, receiver_id, message, created_at)
    VALUES($1, $2, $3, $4) RETURNING id;`
	prep, err := r.Db.PrepareContext(ctx, query)
	if err != nil {
		return http.StatusInternalServerError, err
	}
	defer prep.Close()
	if _, err = prep.ExecContext(ctx, input.SenderID, input.ReceiverID, input.Message, input.CreatedAt); err != nil {
		return http.StatusBadRequest, err
	}
	return http.StatusCreated, nil
}

func (r *messageRepo) GetAllMessagesByUserID(ctx context.Context, userID uint, limit, offset int) ([]entity.Message, int, error) {
	query := `SELECT id, sender_id, receiver_id, message, created_at FROM messages WHERE receiver_id = $1 LIMIT $2 OFFSET $3;`
	prep, err := r.Db.PrepareContext(ctx, query)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	defer prep.Close()

	rows, err := prep.QueryContext(ctx, userID, limit, offset)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	defer rows.Close()

	var messages []entity.Message
	for rows.Next() {
		var message entity.Message
		if err = rows.Scan(&message.ID, &message.SenderID, &message.ReceiverID, &message.Message, &message.CreatedAt); err != nil {
			return nil, http.StatusInternalServerError, err
		}
		messages = append(messages, message)
	}
	return messages, http.StatusOK, nil
}

func (r *messageRepo) GetAllUnreadMessagesByUserID(ctx context.Context, userID uint, limit, offset int) ([]entity.Message, int, error) {
	query := `SELECT id, sender_id, receiver_id, message, created_at FROM messages WHERE receiver_id = $1 AND is_read = false LIMIT $2 OFFSET $3;`
	prep, err := r.Db.PrepareContext(ctx, query)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	defer prep.Close()

	rows, err := prep.QueryContext(ctx, userID, limit, offset)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	defer rows.Close()

	var messages []entity.Message
	for rows.Next() {
		var message entity.Message
		if err = rows.Scan(&message.ID, &message.SenderID, &message.ReceiverID, &message.Message, &message.CreatedAt); err != nil {
			return nil, http.StatusInternalServerError, err
		}
		messages = append(messages, message)
	}
	return messages, http.StatusOK, nil
}

// GetMessagesBySenderIDAndReceiverID will return all messages between two users
func (r *messageRepo) GetMessagesBySenderIDAndReceiverID(ctx context.Context, senderID, receiverID uint, limit, offset int) ([]entity.Message, int, error) {
	query := `SELECT id, sender_id, receiver_id, message, created_at FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) LIMIT $3 OFFSET $4;`
	prep, err := r.Db.PrepareContext(ctx, query)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	defer prep.Close()

	rows, err := prep.QueryContext(ctx, senderID, receiverID, limit, offset)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	defer rows.Close()

	var messages []entity.Message
	for rows.Next() {
		var message entity.Message
		if err = rows.Scan(&message.ID, &message.SenderID, &message.ReceiverID, &message.Message, &message.CreatedAt); err != nil {
			return nil, http.StatusInternalServerError, err
		}
		messages = append(messages, message)
	}
	return messages, http.StatusOK, nil
	
}
