package entity

type Message struct {
	ID         int    `json:"id"`
	SenderID   int    `json:"sender_id"`
	ReceiverID int    `json:"receiver_id"`
	Message    string `json:"message"`
	Action     string `json:"action"`
	CreatedAt  string `json:"created_at"`
	Limit			int			`json:"limit"`
	Offset		int   `json:"offset"`	
}

type MessagesOrder struct {
	Messages []Message
	Action   string `json:"action"`
	Status   int    `json:"status"`
}
