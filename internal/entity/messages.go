package entity

type Message struct {
	ID         int    `json:"id"`
	ReceiverID int    `json:"received_id"`
	SenderID   int    `json:"sender_id"`
	Message    string `json:"message"`
	CreatedAt  string `json:"created_at"`
}

type Messages []Message
