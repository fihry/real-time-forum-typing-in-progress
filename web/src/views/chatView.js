import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle("Chat");
    }

    async getHtml() {
        return `
            <div class="chat-wrapper">
                <div class="sideBar-chat">
                    <div class="chat-title">My contacts</div>
                    <div class="chat-users">
                    </div>
                </div>
                <div class="container-chat">
                    <div class="chat-messages" id="chat-messages">
                        <div class="chat-message chat-user1"> 
                            <div class="message-content">
                                <p>Chat messages will appear here</p>
                            </div>
                        </div>
                        <div class="chat-message chat-user2">
                            <div class="message-content">
                                <p>Chat messages will appear here</p>
                            </div>
                        </div>
                    </div>
                    <form id="chat-form" class="chat-form">
                        <input type="text" id="message" class="chat-input" placeholder="Enter your message" required>
                        <button type="submit" class="chat-button">Send</button>
                    </form>
                    <div id="showError" class="error"></div>
                </div>
            </div>
        `;
    }
    async init() {
        const ws = new WebSocket("ws://localhost:8080/api/ws/chat");
        const chatUsers = document.querySelector(".chat-users");
        const showError = document.getElementById("showError");
        let InitChatData = {
            Contacts: [],
            Messages: [],
        };
        let contacter = {};

        ws.onopen = () => {
            console.log("Connected to chat server");
            showError.textContent = "Connected to chat server";
        };

        ws.onmessage = (event) => {
            try {
                InitChatData = JSON.parse(event.data);
                console.log("Contacts:", InitChatData["Contacts"]);
                chatUsers.innerHTML = ""; // Clear previous contacts
                InitChatData.Contacts.forEach((contact) => {
                    const userElement = document.createElement("div");
                    userElement.className = "chat-user";
                    userElement.textContent = contact.nickname;
                    userElement.addEventListener("click", () => {
                        contacter = contact;
                    });
                    chatUsers.appendChild(userElement);
                });
            } catch (err) {
                console.error("Error:", err);
                showError.textContent = err.message;
            }
        };

        ws.onerror = (event) => {
            console.error("Error:", event);
            showError.textContent = "WebSocket error occurred";
        };

        ws.onclose = (event) => {
            console.log("Connection closed:", event);
            showError.textContent = "Connection closed";
        };

        const chatForm = document.getElementById("chat-form");
        chatForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const messageInput = document.getElementById("message");
            const message = messageInput.value.trim();

            if (message && contacter.user_id) {
                ws.send(JSON.stringify({ message, receiver_id: contacter.user_id }));
                messageInput.value = "";
            } else {
                showError.textContent = "Please select a contact and enter a message";
            }
        });

        showError.textContent = "";
    }
}
