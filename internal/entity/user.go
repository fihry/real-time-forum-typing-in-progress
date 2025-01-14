package entity

type User struct {
	ID          uint   `json:"id"`
	Nickname    string `json:"nickname"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	FirstName   string `json:"firstName"`
	LastName    string `json:"lastName"`
	Age 	    int    `json:"age"`
	Gender      string `json:"gender"`
	ConfirmPass string `json:"cfmpsw"`
	HashPass    string
}
