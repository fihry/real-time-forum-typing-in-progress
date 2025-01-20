import AbstractView from "./AbstractView.js";
export const Ws = new WebSocket(`ws://${window.location.host}/api/ws/chat`);

export default class extends AbstractView {
  constructor(params) {
    super(params);
    this.setTitle("Chat");
    // Initialize class properties
    this.contacts = [];
    this.messages = [];
    this.contacter = {};
    this.sender = {};
    this.ws = Ws;
    // for message pagination
    this.msgOffset = 0;
    this.msgLimit = 20;
    this.msgStatus = "";
    this.isThrottledMessages = false;
    // for contacts pagination
    this.cntOffset = 0;
    this.cntLimit = 20;
    this.cntStatus = "";
    this.isThrottledContacts = false;
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
          <div class="chat-bottom-sideBar">
          <div id="showError" class="error-message"></div>
          <form id="chat-form" class="chat-form">
            <input type="text" id="message" class="chat-input" placeholder="Enter your message" required>
            <button type="submit" class="chat-button">Send</button>
          </form>
          </div>
        </div>
      </div>
    `;
  }

  async init() {
    const showError = document.getElementById("showError");
    const chatUsers = document?.querySelector(".chat-users");

    // WebSocket Event Handlers
    this.ws.onopen = () => {
      console.log("Connected to WebSocket server");
      this.ws.send(JSON.stringify({
        action: "get_contacts",
        offset: this.cntOffset,
        limit: this.cntLimit
      }));
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event, chatUsers, showError);
    };
    this.loadContacts();
    this.removeMessagesBtn();
    // Error handling for WebSocket connection
    this.ws.onclose = (event) => this.handleClose(event, showError);
    this.ws.onerror = (event) => this.handleError(event, showError); 
    showError.textContent = "";
  }

  // Handle incoming WebSocket messages
  handleMessage(event, chatUsers, showError) {
    const data = JSON.parse(event.data);
    switch (data.action) {
      case "get_user":
        this.sender = data;
        console.log("sender", this.sender);
        break;
      case "get_contacts":
        if (data && data.status !== 404) {
          this.contacts = this.contacts.concat(data.Contacts);
          this.cntOffset += data.Contacts.length;
        }
        this.getContacter();
        if (this.contacter) {
          this.loadMessages();
        } else if (data.status == 404) {
          this.cntStatus = 404;
          this.isThrottledContacts = false;
        }
        this.displayContacts(chatUsers);
        break;
      case "get_messages":
        if (data && data.status !== 404) {
          //  append messages to the existing messages
          this.messages = this.messages.concat(data.Messages);
          this.msgOffset += this.messages.length;
        } else if (data.status == 404 || data.Messages.length === 0) {
          this.msgStatus = 404;
          this.isThrottledMessages = false;
        }
        this.displayMessages(showError);
        break;
      case "new_message":
        if (data.sender_id === this.contacter.id) {
          this.messages.push(data);
          showError.textContent = "new message";
          this.displayMessage(data);
        }
        break;
      case "change_status":
        const contact = this.contacts.find(contact => contact.id === data.id);
        if (contact) {
          contact.status = data.status;
          this.displayContacts(chatUsers);
        }
        break;
    }
    this.sendMessage(showError);
  }

  // Display contacts in the sidebar
  displayContacts(chatUsers) {
    chatUsers.innerHTML = ""; // Clear existing contacts
    if (this.contacts.length > 0) {
      this.contacts.forEach(contact => {
        if (contact.id !== this.sender.id) {
          const contactElement = document.createElement("div");
          contactElement.className = "chat-user";
          // add class based on status online/offline
          contactElement.classList.add(contact.status === "online" ? "online" : "offline");
          const initials = contact.nickname.slice(0, 1).toUpperCase() + contact.nickname.slice(1, 2);
          contactElement.innerHTML = `
            <div class="user-avatar">${initials}</div>
            <div class="user-nickname">${contact.nickname}</div>`;
          contactElement.addEventListener("click", () => this.selectContact(contact));
          chatUsers.appendChild(contactElement);
        }
      });
    }
    this.addActiveClass();
  }

  // Select a contact and load their messages
  selectContact(contact) {
    history.pushState(null, null, `/chat/${contact.id}`);
    this.msgOffset = 0;
    this.msgLimit = 20;
    this.msgStatus = "";
    this.isThrottledMessages = false;
    this.messages = [];
    this.contacter = contact;
    this.loadMessages();
    this.addActiveClass();
  }

  // Load messages for the selected contact
  loadMessages() {
    const chatMessages = document.getElementById("chat-messages");
    chatMessages.innerHTML = "";
    if (this.contacter.id) {
      this.ws.send(JSON.stringify({
        action: "get_messages",
        receiver_id: this.contacter.id,
        offset: this.msgOffset,
        limit: this.msgLimit
      }));
    }
    if (this.msgStatus === 404) {
      this.isThrottledMessages = false;
    };
    this.throttleMessages();
  }

  loadContacts() {
    const chatUsers = document.querySelector(".chat-users");
    chatUsers.innerHTML = "";
    this.ws.send(JSON.stringify({
      action: "get_contacts",
      offset: this.cntOffset,
      limit: this.cntLimit
    }));
    if (this.cntStatus === 404) {
      this.isThrottledContacts = false;
    }
    this.throttleContacts();
  }

  // Display chat messages
  displayMessages(showError) {
    const chatMessages = document.getElementById("chat-messages");
    // reverse the messages array to display the latest message at the bottom
    this.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
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
    showError.textContent = "";
    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to bottom
  }

  // Display a single message (from local input)
  displayMessage(message) {
    if (this.contacter.id === message.receiver_id) {
      const chatMessages = document.getElementById("chat-messages");
      const messageElement = document.createElement("div");
      messageElement.className = "chat-message chat-user2";
      messageElement.innerHTML = `
        <div class="message-content">
          <p>${this.sanitizeMessage(message.message)}</p>
        </div>
      `;
      const senderElement = document.createElement("div");
      senderElement.className = "message-sender";
      senderElement.textContent = "You";
      messageElement.prepend(senderElement);
      chatMessages.appendChild(messageElement);
      chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to bottom
    }
  }

  // Send a message to the selected contact
  sendMessage(showError) {
    const chatForm = document.getElementById("chat-form");
    chatForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const messageInput = document.getElementById("message");
      const message = messageInput.value;
      if (message && message.length > 0) {
        this.ws.send(JSON.stringify({
          action: "new_message",
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

  // this function get the contacterId frome the location path 
  getContacter() {
    const path = window.location.pathname;
    const id = path.split("/")[2];
    this.contacter = this.contacts.find(contact => contact.id == id);
  }

  getContactsByLimit() {
    this.ws.send(JSON.stringify({
      action: "get_contacts",
      offset: this.cntOffset,
      limit: this.cntLimit
    }));
  }

  throttleContacts() {
    const chatUsers = document.querySelector(".chat-users");
    if (this.cntStatus === 404) {
      return;
    }
    chatUsers.addEventListener("scroll", () => {
      if (this.isThrottledContacts) return;
      this.isThrottledContacts = true;

      setTimeout(() => {
        if (this.cntStatus !== 404) {
          this.loadContacts();
        }
        this.isThrottledContacts = false;
      }, 200);
    });
  }

  throttleMessages() {
    const chatMessages = document.getElementById("chat-messages");
    if (this.msgStatus === 404) {
      return;
    }
    chatMessages.addEventListener("scroll", () => {
      if (this.isThrottledMessages) return;
      this.isThrottledMessages = true;

      setTimeout(() => {
        if (chatMessages.scrollTop <= 100 && this.msgStatus !== 404) {
          this.loadMessages();
        }
        this.isThrottledMessages = false;
      }, 200);
    });
  }

  // Add active class to the selected contact in the sidebar

  addActiveClass() {
    // get elements with class name chat-user that ahve the nickname of the contacter 
    const chatUsers = document.querySelectorAll(".chat-user");
    chatUsers.forEach(chatUser => {
      if (chatUser.querySelector(".user-nickname").textContent === this.contacter.nickname) {
        chatUser.classList.add("active");
      } else {
        chatUser.classList.remove("active");
      }
    });
  }

  // Remove the messages-btn from the navbar when the page is in chat
  removeMessagesBtn() {
    const messagesBtn = document.querySelector("#messages-btn");
    if (messagesBtn) {
      messagesBtn.remove();
    }
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