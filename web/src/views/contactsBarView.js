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
    <div class="sideBar-chat">
          <div class="chat-title">My contacts</div>
          <div class="chat-users"></div>
    </div>
    `;
  }
  init() {
    Ws.init();
    this.ws = Ws.getWs();
    this.sender = {};
    // get contacts
    this.ws.send(JSON.stringify({
      action: "get_contacts",
    }));
    // Handle incoming WebSocket messages
    this.ws.addEventListener("message", (event) => this.handleMessage(event));

    // Error handling for WebSocket connection
    this.ws.onclose = (event) => this.handleClose(event, showError);
    this.ws.onerror = (event) => this.handleError(event, showError);
  }

  handleMessage(event) {
    const chatUsers = document?.querySelector(".chat-users");
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
    chatUsers.innerHTML = ""; // Clear existing contacts
    if (this.contacts.length > 0) {
      this.contacts.forEach(contact => {
        if (contact.id !== this.sender.id) {
          console.log(contact);
          const contactElement = document.createElement("div");
          contactElement.className = "chat-user";
          // add class based on status online/offline
          contactElement.classList.add(contact.status === "online" ? "online" : "offline");
          const initials = contact.nickname.slice(0, 1).toUpperCase() + contact.nickname.slice(1, 2);
          contactElement.innerHTML = `
            <div class="user-avatar">${initials}</div>
            <div class="user-nickname">${contact.nickname.length > 8 ? `${contact.nickname.slice(0, 8)}...` : contact.nickname}</div>`;
          contactElement.onclick = () => {
            navigateTo.navigateTo(`/chat/${contact.id}`)  // Navigate to chat page
          };
          chatUsers.appendChild(contactElement);
        }
      });
    }
  }
}