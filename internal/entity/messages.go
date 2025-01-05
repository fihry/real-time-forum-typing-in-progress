package entity

type Message struct {
	ID         int    `json:"id"`
	ReceiverID int    `json:"receiver_id"`
	SenderID   int    `json:"sender_id"`
	Message    string `json:"message"`
	CreatedAt  string `json:"created_at"`
}

type Messages []Message

// that type well parse the messages and contacts from the database together with the user id

type InitChatData struct {
	Contacts []Contact  `json:"contacts"`
	Messages []Messages `json:"messages"`
}
