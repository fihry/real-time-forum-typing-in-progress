
import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle("Chat");
    }

    async getHtml() {
        return `
                <div class="chat-wrapper">
                    <div class="chat-header">
                        <h2 class="chat-title">Chat</h2>
                    </div>
                    <div class="chat-body">
                        <div class="chat-messages" id="chat-messages"></div>
                        <form id="chat-form" class="chat-form">
                            <input 
                                type="text" 
                                id="message" 
                                class="form-control" 
                                placeholder="Enter your message" 
                                required
                            >
                            <button type="submit" class="btn btn-primary">Send</button>
                        </form>
                    </div>

                    <div id="showError" class="error-message"></div>
                </div>
            `;
    }


    async init(){
        const chatForm = document.getElementById("chat-form");
        const chatMessages = document.getElementById("chat-messages");
        // Connect to WebSocket
        const ws = new WebSocket("ws://localhost:8080/api/chat");
        // Send message to chat
        chatForm.addEventListener("submit", async (e) => {
            e.preventDefault(); // Prevent default form submission
            const messageInput = document.getElementById("message");
            const message = messageInput.value;
            ws.send(JSON.stringify({ message }));

            messageInput.value = "";

        });
        // Listen for messages
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.error) {
                document.getElementById("showError").innerHTML = data.error;
                return;
            }
            data.messages.forEach((message) => {
                const messageElement = document.createElement("div");
                messageElement.classList.add("chat-message");
                messageElement.innerHTML = `
                    <div class="message-content">
                        <p>${message}</p>
                    </div>
                `;
    
                chatMessages.appendChild(messageElement);
            });

            console.log("Chat messages:", data.messages);
        };
        
        // clear chat messages
        document.getElementById("showError").innerHTML = "";
        // Append messages to chat
    }
}