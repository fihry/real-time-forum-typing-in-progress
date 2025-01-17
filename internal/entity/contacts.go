package entity

type Contact struct {
	ID        uint   `json:"id"`
	Nickname  string `json:"nickname"`
	Email     string `json:"email"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Age       int    `json:"age"`
	Gender    string `json:"gender"`
	Status    string `json:"status"`
	Action    string `json:"action"`
	Contacted bool   `json:"contacted"`
}

type ConstacsOrder struct {
	Contacts []Contact 
	Action	 string `json:"action"`
}
