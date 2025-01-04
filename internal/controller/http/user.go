package http

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"forum/internal/controller/ws"
	"forum/internal/entity"
	smpljwt "forum/pkg/smplJwt"

	"github.com/gorilla/websocket"
)

func (h *Handler) signUp(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.errorHandler(w, r, http.StatusMethodNotAllowed, "not allowed method")
		return
	}
	var input entity.User
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&input); err != nil {
		h.errorHandler(w, r, http.StatusBadRequest, fmt.Sprintf("invalid json input: %v", err.Error()))
		return
	}
	status, err := h.service.User.Create(r.Context(), input)
	if err != nil {
		h.errorHandler(w, r, status, fmt.Sprintf("bad request: %v", err.Error()))
		return
	}
	w.WriteHeader(status)
}

func (h *Handler) signIn(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.errorHandler(w, r, http.StatusMethodNotAllowed, "not allowed method")
		return
	}
	var input entity.User
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&input); err != nil {
		h.errorHandler(w, r, http.StatusBadRequest, fmt.Sprintf("invalid json input: %v", err.Error()))
		return
	}
	token, status, err := h.service.SignIn(r.Context(), input)
	if err != nil {
		h.errorHandler(w, r, status, err.Error())
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    token,
		Path:     "/",
		Expires:  time.Now().Add(12 * time.Hour),
		HttpOnly: true,
	})

	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"token": token,
	}); err != nil {
		h.errorHandler(w, r, http.StatusInternalServerError, err.Error())
		return
	}
}

func (h *Handler) isValidToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.errorHandler(w, r, http.StatusMethodNotAllowed, "not allowed method")
		return
	}
	cookie, err := r.Cookie("token")
	if err != nil {
		if err == http.ErrNoCookie {
			if err := json.NewEncoder(w).Encode(map[string]interface{}{
				"checker": false,
			}); err != nil {
				h.errorHandler(w, r, http.StatusInternalServerError, err.Error())
				return
			}
			return
		}
		h.errorHandler(w, r, http.StatusInternalServerError, err.Error())
		return
	}

	exist, err := h.service.IsTokenExist(r.Context(), cookie.Value)
	if err != nil {
		h.errorHandler(w, r, http.StatusInternalServerError, err.Error())
		return
	}
	if !exist {
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"checker": false,
		}); err != nil {
			h.errorHandler(w, r, http.StatusInternalServerError, err.Error())
			return
		}
		return
	}
	_, err = smpljwt.ParseToken(cookie.Value, h.secret)
	if err != nil {
		if err == smpljwt.ErrExpiredToken {
			if dberr := h.service.DeleteSessionByToken(r.Context(), cookie.Value); dberr != nil {
				h.errorHandler(w, r, http.StatusInternalServerError, dberr.Error())
				return
			}
		}
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"checker": false,
		}); err != nil {
			h.errorHandler(w, r, http.StatusInternalServerError, err.Error())
			return
		}
		return
	}
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"checker": true,
	}); err != nil {
		h.errorHandler(w, r, http.StatusInternalServerError, err.Error())
		return
	}
}

func (h *Handler) signOut(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.errorHandler(w, r, http.StatusMethodNotAllowed, "not allowed method")
		return
	}
	token := r.Context().Value(h.service.TokenKey).(string)
	if err := h.service.DeleteSessionByToken(r.Context(), token); err != nil {
		h.errorHandler(w, r, http.StatusInternalServerError, err.Error())
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:   "token",
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	})

	w.WriteHeader(http.StatusOK)
}

func (h *Handler) realechat(w http.ResponseWriter, r *http.Request) {
	// Prepare websocket
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("error occured while upgrading connection: %s", err)
		return
	}
	defer conn.Close()

	// get id from token and identify client
	token := r.Context().Value(h.service.TokenKey).(string)
	id, err := smpljwt.ParseToken(token, h.secret)
	if err != nil {
		log.Printf("error occured while parsing token: %s", err)
		return
	}
	ws.NewManager().AddClient(id, conn)
	defer ws.NewManager().RemoveClient(id)
	var contacts []entity.Contact
	// get contacts with id from db
	contacts, status, err := h.service.GetAllContacts(r.Context(), uint(id))
	if err := conn.WriteJSON(contacts); err != nil {
		log.Printf("error occured while writing contacts: %s", err)
		return
	}
	if status != http.StatusOK {
		log.Printf("error occured while getting contacts: %s", err)
		return
	}
	var message entity.Message
	go conn.ReadJSON(&message)
	// print contacts
	log.Printf("contacts: %v len: %d", contacts, len(contacts))
	// read and write messages
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("error occured while reading message: %s", err)
			break
		}
		go ws.NewManager().ReadFromClient(id)
		go ws.NewManager().WriteToClient(id, message)
		log.Printf("client %d: %s", id, message)
	}
}
