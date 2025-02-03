package repository

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"time"

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
	input.CreatedAt = time.Now().Format("2006-01-02 15:04:05")
	if _, err = prep.ExecContext(ctx, input.SenderID, input.ReceiverID, input.Message, input.CreatedAt); err != nil {
		return http.StatusBadRequest, err
	}
	return http.StatusCreated, nil
}

// GetContacts retrieves both contacted and uncontacted users in a single SQL query.
func (r *messageRepo) GetAllContacts(ctx context.Context, userID uint) ([]entity.Contact, int, error) {
	query := `
    SELECT id, nickname, contacted
    FROM (
        SELECT id, nickname, true AS contacted, 
               (SELECT MAX(created_at) 
                FROM messages 
                WHERE (sender_id = $1 AND receiver_id = users.id) OR 
                      (sender_id = users.id AND receiver_id = $1)) AS last_interaction
        FROM users
        WHERE id IN (
            SELECT DISTINCT sender_id FROM messages WHERE receiver_id = $1
            UNION
            SELECT DISTINCT receiver_id FROM messages WHERE sender_id = $1
        )

        UNION ALL

        SELECT id, nickname, false AS contacted, NULL AS last_interaction
        FROM users
        WHERE id NOT IN (
            SELECT DISTINCT sender_id FROM messages WHERE receiver_id = $1
            UNION
            SELECT DISTINCT receiver_id FROM messages WHERE sender_id = $1
        )
    ) AS combined
    ORDER BY 
        contacted DESC,
        last_interaction DESC NULLS LAST,
        nickname ASC;`

	prep, err := r.Db.PrepareContext(ctx, query)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	defer prep.Close()

	// Execute the query
	rows, err := prep.QueryContext(ctx, userID)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	defer rows.Close()

	// Collect the contacts
	var contacts []entity.Contact
	for rows.Next() {
		var contact entity.Contact
		if err := rows.Scan(&contact.ID, &contact.Nickname, &contact.Contacted); err != nil {
			return nil, http.StatusInternalServerError, err
		}
		contacts = append(contacts, contact)
	}

	// If no contacts are found, return 404
	if len(contacts) == 0 {
		return nil, http.StatusNotFound, nil
	}

	return contacts, http.StatusOK, nil
}

// GetMessagesBySenderIDAndReceiverID retrieves all messages between two users
func (r *messageRepo) GetMessagesBySenderIDAndReceiverID(ctx context.Context, senderID, receiverID uint, limit, offset int) ([]entity.Message, int, error) {
	query := `SELECT id, sender_id, receiver_id, message, created_at FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY created_at DESC,id DESC LIMIT $3 OFFSET $4;`
	prep, err := r.Db.PrepareContext(ctx, query)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	defer prep.Close()

	rows, err := prep.QueryContext(ctx, senderID, receiverID, limit, offset)
	if err != nil {
		log.Printf("Error in get messages: %v", err)
		return nil, http.StatusBadRequest, err
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

	// if not still any messages found by limit and offset
	if len(messages) == 0 {
		return nil, http.StatusNotFound, nil
	}

	return messages, http.StatusOK, nil
}
