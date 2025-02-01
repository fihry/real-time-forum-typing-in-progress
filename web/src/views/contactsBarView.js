import navigateTo from "../index.js";
import AbstractView from "./AbstractView.js";
import Ws from "../pkg/ws.js";

export default class extends AbstractView {
  constructor(params) {
    super(params);
    this.ws = {};
    this.contacts = [];
  }

  async getHtml() {
    return `
    <div class="contactsBare">
          <div class="contacts-title">My contacts</div>
          <div class="contacts"></div>
    </div>
    `;
  }
  init() {
    Ws.init();
    this.ws = Ws.getWs();
    this.sender = {};
    // get contacts
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: "get_contacts",
      }));
      // Handle incoming WebSocket messages
      this.ws.addEventListener("message", (event) => this.handleMessage(event));
  
      // Error handling for WebSocket connection
      this.ws.onclose = (event) => this.handleClose(event, showError);
      this.ws.onerror = (event) => this.handleError(event, showError);
    }else {
      console.error("WebSocket is not open. Current state: " + this.ws.readyState);
      this.reconnectSocket()
    }
  }

  reconnectSocket() {
    console.log('you just disconnected, reconnecting...')
    setTimeout(() => {
      Ws.init();
      // get contacts
      this.ws.send(JSON.stringify({
        action: "get_contacts",
      }));
      if (this.ws.readyState === WebSocket.OPEN) {
        console.log("Websocket connection well established")
      }
      // Handle incoming WebSocket messages
      this.ws.addEventListener("message", (event) => this.handleMessage(event));

      // Error handling for WebSocket connection
      this.ws.onclose = (event) => this.handleClose(event, showError);
      this.ws.onerror = (event) => this.handleError(event, showError);
    }, 2000);
  }

  handleMessage(event) {
    const chatUsers = document?.querySelector(".contacts");
    const data = JSON.parse(event.data);
    if (data) {
      switch (data.action) {
        case "get_user":
          this.sender = data;
          break;
        case "get_contacts":
          this.contacts = data.Contacts;
          this.displayContacts(chatUsers);
          break;
        case "change_status":
          const contact = this.contacts.find(contact => contact.id === data.id);
          if (contact) {
            contact.status = data.status;
            this.displayContacts(chatUsers);
          }
          break;
        default:
          break;
      }
    }

  }

  displayContacts(chatUsers) {
    if (chatUsers) {
      chatUsers.innerHTML = "";
    }
    if (this.contacts.length > 0) {
      this.contacts.forEach(contact => {
        if (contact.id !== this.sender.id) {
          const contactElement = document.createElement("div");
          contactElement.className = "contact";
          // add class based on status online/offline
          contactElement.classList.add(contact.status === "online" ? "online" : "offline");
          const initials = contact.nickname.slice(0, 1).toUpperCase() + contact.nickname.slice(1, 2);
          contactElement.innerHTML = `
            <div class="contact-avatar">${initials}</div>
            <div class="contact-nickname">${contact.nickname.length > 8 ? `${contact.nickname.slice(0, 8)}...` : contact.nickname}</div>`;
          contactElement.onclick = () => {
            navigateTo.navigateTo(`/chat/${contact.id}`)  // Navigate to chat page
          };
          if (chatUsers) {
            chatUsers.appendChild(contactElement);
          }
        }
      });
    }
  }
}