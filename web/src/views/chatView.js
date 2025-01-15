import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
  constructor(params) {
    super(params);
    this.setTitle("Chat");
    // Initialize class properties
    this.contacts = [];
    this.messages = this.messages || [];
    this.contacter = {};
    this.ws = null; // WebSocket instance
  }

  async getHtml() {
    return `
      <div class="chat-wrapper">
        <div class="sideBar-chat">
          <div class="chat-title">My contacts</div>
          <div class="chat-users"></div>
        </div>
        <div class="container-chat">
          <div class="chat-messages" id="chat-messages"></div>
          <form id="chat-form" class="chat-form">
            <input type="text" id="message" class="chat-input" placeholder="Enter your message" required>
            <button type="submit" class="chat-button">Send</button>
          </form>
          <div id="showError" class="error"></div>
        </div>
      </div>
    `;
  }

  // Initialize the chat view
  async init() {
    const showError = document.getElementById("showError");
    const chatUsers = document?.querySelector(".chat-users");
    this.ws = new WebSocket("ws://localhost:8089/api/ws/chat");

    // WebSocket Event Handlers
    this.ws.onopen = () => {
      console.log("Connected to chat server");
      showError.textContent = "Connected to chat server";
    };

    this.ws.onmessage = (event) => this.handleMessage(event, chatUsers, showError);
    this.ws.onerror = (event) => this.handleError(event, showError);
    this.ws.onclose = (event) => this.handleClose(event, showError);


    // Reset error message
    showError.textContent = "";
  }

  // Handle incoming WebSocket messages
  handleMessage(event, chatUsers, showError) {
    const data = JSON.parse(event.data);
    if (data.action === "get_contacts") {
      this.contacts = data.Contacts;
      this.displayContacts(chatUsers);
    } else if (data.action === "get_messages") {
      this.messages = data.Messages;
      this.displayMessages();
    } else if (data.action === "") {
      this.displayMessage(data.message);
    } else if (data.action === "error") {
      showError.textContent = data.message;
    }
    this.sendMessage(showError);
  }

  // Display contacts in the sidebar
  displayContacts(chatUsers) {
    chatUsers.innerHTML = ""; // Clear existing contacts
    if (this.contacts.length > 0) {
      this.contacts.forEach(contact => {
        const contactElement = document.createElement("div");
        contactElement.className = "chat-user";
        // add class based on status online/offline
        contactElement.classList.add(contact.status === "online" ? "online" : "offline");
        contactElement.innerHTML = `<div class="user-nickname">${contact.nickname}</div>`;
        contactElement.addEventListener("click", () => this.selectContact(contact));
        chatUsers.appendChild(contactElement);
      });
    }
  }

  // Select a contact and load their messages
  selectContact(contact) {
    this.contacter = contact;
    this.loadMessages();
    // window.location.pathname = `/chat/${contact.nickname}`;
  }

  // Load messages for the selected contact
  loadMessages() {
    const chatMessages = document.getElementById("chat-messages");
    chatMessages.innerHTML = "";
    if (this.contacter.id) {
      this.ws.send(JSON.stringify({
        action: "get_messages",
        receiver_id: this.contacter.id
      }));
    }
  }

  // Display chat messages
  displayMessages() {
    const chatMessages = document.getElementById("chat-messages");
    this.messages?.forEach(message => {
      const messageElement = document.createElement("div");
      console.log("message", message);
      messageElement.className = `chat-message ${message.sender_id === this.contacter.id ? "chat-user1" : "chat-user2"}`;
      messageElement.innerHTML = `
      <div class="time_message">${new Date(message.created_at).toLocaleString()}</div>
        <div class="message-content">
          <p>${this.sanitizeMessage(message.message)}</p>
        </div>
      `;
      const senderElement = document.createElement("div");
      senderElement.className = "message-sender";
      senderElement.textContent = message.sender_id === this.contacter.id ? this.contacter.nickname : "You";
      messageElement.prepend(senderElement);
      chatMessages.appendChild(messageElement);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to bottom
  }
  // Display a single message (from local input)
  displayMessage(message) {
    const chatMessages = document.getElementById("chat-messages");
    const messageElement = document.createElement("div");
    messageElement.className = `chat-message ${message.sender_id === this.contacter.id ? "chat-user1" : "chat-user2"}`;
    messageElement.innerHTML = `
    <div class="time_message">${new Date().toLocaleTimeString()}</div>
      <div class="message-content">
        <p>${this.sanitizeMessage(message.message)}</p>
      </div>
    `;
    const senderElement = document.createElement("div");
    const timeElement = document.createElement("div");
    senderElement.className = "message-sender";
    timeElement.className = "message-time";
    senderElement.textContent = message.sender_id === this.contacter.id ? this.contacter.nickname : "You";
    messageElement.prepend(senderElement);
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to bottom
  }

  // Send a message to the selected contact
  sendMessage(showError) {
    const chatForm = document.getElementById("chat-form");
    chatForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const messageInput = document.getElementById("message");
      const message = messageInput.value
      console.log("Sending message:", message);
      if (message && message.length > 0) {
        this.ws.send(JSON.stringify({
          receiver_id: this.contacter.id,
          message: message
        }));
        this.displayMessage({
          receiver_id: this.contacter.id,
          message: message
        });
        messageInput.value = "";
      } else {
        showError.textContent = "Message cannot be empty.";
      }
    });
  }



  // Error handling for WebSocket connection
  handleError(event, showError) {
    console.error("WebSocket error:", event);
    showError.textContent = "WebSocket error occurred.";
  }

  // Handle WebSocket connection close
  handleClose(event, showError) {
    console.log("WebSocket connection closed:", event);
    showError.textContent = "Connection closed.";
  }

  // Sanitize message content to prevent XSS
  sanitizeMessage(message) {
    return message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}
