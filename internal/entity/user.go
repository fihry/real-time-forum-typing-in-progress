package entity

type User struct {
	ID          uint   `json:"id"`
	Nickname    string `json:"nickname"`
	Age         int    `json:"age"`
	FirstName   string `json:"firstName"`
	LastName    string `json:"lastName"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	ConfirmPass string `json:"cfmpsw"`
	HashPass    string
}
