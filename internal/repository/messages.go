package repository

import (
	"context"
	"database/sql"
	"net/http"

	"forum/internal/entity"
)

type messageRepo struct {
	Db *sql.DB
}

func newMessageRepository(db *sql.DB) *messageRepo {
	return &messageRepo{Db: db}
}

func (r *messageRepo) CreateMessage(ctx context.Context, input entity.Message) (int, error) {
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

func (r *messageRepo) GetAllContacts(ctx context.Context, userID uint) ([]entity.Contact, int, error) {
	query := `SELECT id, nickname, 
		CASE 
			WHEN id IN (SELECT DISTINCT sender_id FROM messages WHERE receiver_id = $1) 
			OR id IN (SELECT DISTINCT receiver_id FROM messages WHERE sender_id = $1) 
			THEN true 
			ELSE false 
		END AS contacted 
		FROM users;`
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
	var contacts []entity.Contact
	for rows.Next() {
		var contact entity.Contact
		if err = rows.Scan(&contact.ID, &contact.Nickname, &contact.Contacted); err != nil {
			return nil, http.StatusInternalServerError, err
		}
		contacts = append(contacts, contact)
	}
	return contacts, http.StatusOK, nil
}

// This function get users that have contacted by the user sorted by the last message than not been contacted by the user yet sorted by the last message sorted alphabetically
func (r *messageRepo) GetContactsOrderedByLastMessage(ctx context.Context, userID uint, limit, offset int) ([]entity.Contact, int, error) {
	query := `SELECT id, nickname,
		CASE
			WHEN id IN (SELECT DISTINCT sender_id FROM messages WHERE receiver_id = $1)
			OR id IN (SELECT DISTINCT receiver_id FROM messages WHERE sender_id = $1)
			THEN true
			ELSE false
		END AS contacted
		FROM users
		WHERE id IN (SELECT DISTINCT sender_id FROM messages WHERE receiver_id = $1)
		OR id IN (SELECT DISTINCT receiver_id FROM messages WHERE sender_id = $1)
		ORDER BY (SELECT MAX(created_at) FROM messages WHERE (sender_id = $1 AND receiver_id = users.id) OR (sender_id = users.id AND receiver_id = $1)) DESC
		LIMIT $2 OFFSET $3;`
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

	var contacts []entity.Contact
	for rows.Next() {

		var contact entity.Contact
		if err = rows.Scan(&contact.ID, &contact.Nickname, &contact.Contacted); err != nil {
			return nil, http.StatusInternalServerError, err
		}
		contacts = append(contacts, contact)
	}
	return contacts, http.StatusOK, nil
}


// this function get all contacts thas not contact with them yet
func (r *messageRepo) GetContactsNotContacted(ctx context.Context, userID uint, limit, offset int) ([]entity.Contact, int, error) {
	query := `SELECT id, nickname,
		CASE	
			WHEN id IN (SELECT DISTINCT sender_id FROM messages WHERE receiver_id = $1)
			OR id IN (SELECT DISTINCT receiver_id FROM messages WHERE sender_id = $1)
			THEN true
			ELSE false
		END AS contacted
		FROM users
		WHERE id NOT IN (SELECT DISTINCT sender_id FROM messages WHERE receiver_id = $1)
		AND id NOT IN (SELECT DISTINCT receiver_id FROM messages WHERE sender_id = $1)
		ORDER BY nickname ASC
		LIMIT $2 OFFSET $3;`
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

	var contacts []entity.Contact
	for rows.Next() {
		var contact entity.Contact
		if err = rows.Scan(&contact.ID, &contact.Nickname, &contact.Contacted); err != nil {
			return nil, http.StatusInternalServerError, err
		}
		contacts = append(contacts, contact)
	}
	return contacts, http.StatusOK, nil
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
