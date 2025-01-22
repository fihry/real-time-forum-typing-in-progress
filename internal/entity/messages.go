package entity

type Message struct {
	ID         int    `json:"id"`
	SenderID   uint    `json:"sender_id"`
	Nickname   string `json:"nickname"`
	ReceiverID uint    `json:"receiver_id"`
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
