import AbstractView from "./AbstractView.js";
export const Ws = new WebSocket(`ws://${window.location.host}/api/ws/chat`);

export default class extends AbstractView {
  constructor(params) {
    super(params);
    this.setTitle("Chat");
    // Initialize class properties
    this.contacts = [];
    this.contacter = {};
    this.sender = {};
    this.ws = Ws;
    // for message pagination
    this.msgOffset = 0;
    this.msgLimit = 20;
    this.msgStatus = "";
    this.cntOffset = 0;
    this.cntLimit = 100;
    this.ended = false;
    this.isThrottledMessages = false;
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
    };

    // Send a message to the server to get the user
    this.ws.send(JSON.stringify({
      action: "get_user"
    }));

    // Send a message to the server to get the contacts
    this.ws.send(JSON.stringify({
      action: "get_contacts",
      offset: this.cntOffset,
      limit: this.cntLimit
    }));

    // Handle incoming WebSocket messages
    this.ws.onmessage = (event) => {
      this.handleMessage(event, chatUsers, showError);
    };

    // initialize the contacter and load the messages
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
    if (data) {
      switch (data.action) {
        case "get_user":
          this.sender = data;
          break;
        case "get_contacts":
          this.contacts = data.Contacts;
          this.displayContacts(chatUsers);
          this.getContacter();
          if (this.contacter) {
            this.loadMessages();
          }
          break;
        case "new_message":
          // alert("new message" + data);
          this.notify(data, this.sender);
          // change the contact place in the sidebar to the top when a new message is received or sent
          const sender = this.contacts.find(contact => contact.id === data.sender_id);
          this.changeContactPlace(sender);
          if (this.contacter.id === data.sender_id) {
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
        case "get_messages":
          this.msgStatus = data.status;
          this.displayMessages(showError, data);
          break;
      }
    }
    this.sendMessage(showError);
  }




  // Load messages for the selected contact
  loadMessages() {
    const chatMessages = document.getElementById("chat-messages");
    if (this.contacter.id) {
      this.ws.send(JSON.stringify({
        action: "get_messages",
        receiver_id: this.contacter.id,
        offset: this.msgOffset,
        limit: this.msgLimit
      }));
    }
    this.attachScrollListener();
  }

  // Load more messages when scrolling to the top
  loadMoreMessages() {
    if (this.isThrottledMessages || this.ended) return; // Prevent multiple requests

    this.isThrottledMessages = true; // Set throttling flag
    this.msgOffset += this.msgLimit; // Increase the offset for pagination

    // Send a request to load more messages
    this.ws.send(JSON.stringify({
      action: "get_messages",
      receiver_id: this.contacter.id,
      offset: this.msgOffset,
      limit: this.msgLimit
    }));

    // Reset throttling flag after a short delay
    setTimeout(() => {
      this.isThrottledMessages = false;
    }, 200); // Adjust the timeout as needed
  }

  // Display messages for the selected contact
  displayMessages(showError, data) {
    const chatMessages = document.getElementById("chat-messages");
    this.messages = this.messages.concat(data.Messages);
    let index = this.messages.findIndex(message => message.id === data.Messages[0].id);
    this.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    this.messages.splice(index, data.Messages.length);
    if (data.Messages.length > 0) {
      data.Messages.forEach(message => {
        const messageElement = document.createElement("div");
        messageElement.className = `chat-message ${message.sender_id === this.contacter.id ? "chat-user1" : "chat-user2"}`;
        const time = new Date(message.created_at).toLocaleString();
        messageElement.innerHTML = `
        <div class="time_message">${time}</div>
        <div class="message-content">
          <p>${this.sanitizeMessage(message.message)}</p>
        </div>
      `;
        const senderElement = document.createElement("div");
        senderElement.className = "message-sender";
        senderElement.textContent = message.sender_id === this.sender.id ? this.sender.nickname : this.contacter.nickname;
        messageElement.prepend(senderElement);
        chatMessages.prepend(messageElement); // Prepend to show new messages at the bottom
      });
      chatMessages.scrollTop = chatMessages.scrollHeight / 2.5; // Scroll to the bottom after loading new messages
    } else {
      if (this.msgOffset === 0) {
        showError.textContent = "No messages found.";
      } else {
        this.ended = true; // No more messages to load
      }
    }
  }



  // Display messages for the selected contact
  // Attach scroll event listener with throttling
  attachScrollListener() {
    const chatMessages = document.getElementById("chat-messages");
    chatMessages.addEventListener("scroll", this.handleScroll.bind(this));
  }

  // Handle scroll event
  handleScroll() {
    const chatMessages = document.getElementById("chat-messages");

    // Check if the user has scrolled to the top
    if (chatMessages.scrollTop === 0 && !this.isThrottledMessages && !this.ended) {
      setInterval(() => {
        this.isThrottledMessages = true; // Set throttling flag
        this.loadMoreMessages();
      }
        , 200);
    }
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

  notify(data, sender) {
    // create notification element and apeend it to the messages div
    const notification = document.createElement("div");
    notification.className = "notify";
    notification.innerHTML = `
      <div class="notify-sender-info">
      <div class="notify-sender-avatar">${sender.nickname.slice(0, 1).toUpperCase()}</div>
      <div class="notify-sender-name">${sender.nickname}</div>
      </div>
      <div class="notify-content">
      <p>${data.message.length > 12 ? `${data.message.slice(0, 12)}...` : data.message}</p>
      </div>
      <span class="close-notify">x</span>
    `;
    // append the notification to the body
    document.body.appendChild(notification);
    // remove the notification after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
    // add event listener to the close button
    notification.querySelector(".close-notify").addEventListener("click", () => {
      notification.remove();
    });
    // play raciving message sound
    const audio = new Audio("/src/assets/audio/receiving.mp3");
    audio.play();
  }

  // Select a contact and load their messages
  selectContact(contact) {
    // clear the chat messages
    const chatMessages = document.getElementById("chat-messages");
    chatMessages.innerHTML = "";
    history.pushState(null, null, `/chat/${contact.id}`);
    // clean the params
    this.msgOffset = 0;
    this.msgStatus = "";
    this.contacter = contact;
    this.messages = [];
    this.ended = false;
    this.loadMessages();
    this.addActiveClass();
  }

  // Load more messages when the user scrolls to the top
  loadMoreMessages() {
    const chatMessages = document.getElementById("chat-messages");
    if (chatMessages.scrollTop === 0 && this.msgStatus !== 404) {
      this.msgOffset += this.msgLimit;
      this.loadMessages();
    } else if (this.msgStatus === 404) {
      this.ended = true;
    }
  }

  loadContacts() {
    const chatUsers = document.querySelector(".chat-users");
    chatUsers.innerHTML = "";
    this.ws.send(JSON.stringify({
      action: "get_contacts",
      offset: 0,
      limit: 100
    }));
    if (this.cntStatus === 404) {
      this.isThrottledContacts = false;
    }
  }

  // change the contact place in the sidebar to the top when a new message is received or sent
  changeContactPlace(contact) {
    const chatUsers = document.querySelectorAll(".chat-user");
    chatUsers.forEach(chatUser => {
      if (chatUser.querySelector(".user-nickname").textContent === contact.nickname) {
        chatUsers[0].before(chatUser);
      }
    });
  }

  // Display a single message (from local input)
  displayMessage(message) {
    const chatMessages = document.getElementById("chat-messages");
    const messageElement = document.createElement("div");
    messageElement.className = `chat-message ${message.sender_id === this.contacter.id ? "chat-user1" : "chat-user2"}`;
    const time = new Date().toLocaleString();
    messageElement.innerHTML = `
         <div class="time_message">${time}</div>
        <div class="message-content">
          <p>${this.sanitizeMessage(message.message)}</p>
        </div>
      `;
    const senderElement = document.createElement("div");
    senderElement.className = "message-sender";
    senderElement.textContent = this.sender.nickname;
    messageElement.prepend(senderElement);
    chatMessages.appendChild(messageElement);
    messageElement.scrollIntoView();
    chatMessages.scrollTop = chatMessages.scrollHeight;
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
        // play sending message sound
        const audio = new Audio("/src/assets/audio/sending.mp3");
        audio.play();

        messageInput.value = "";
        this.changeContactPlace(this.contacter);
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