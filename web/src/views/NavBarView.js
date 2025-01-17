import AbstractView from "./AbstractView.js";
import Utils from "../pkg/Utils.js";
import fetcher from "../pkg/fetcher.js";
import { Ws } from "./chatView.js";

export default class extends AbstractView {
  constructor(params, user) {
    super(params);
    this.user = user;
    this.ws = Ws;
  }

  async getHtml() {
    const isAuthorized = await fetcher.isLoggedIn();
    return `
        <div class="logo" id="logo">Forum App</div>
        <div id="nav-auth-links" class="${isAuthorized ? "hidden" : ""}">
            <button id="login-btn" class="btn login">Login</button>
            <button id="register-btn" class="btn register">Register</button>
        </div>
        <div id="nav-user-links" class="${isAuthorized ? "" : "hidden"}">
        ${location.pathname !== "/create-post"
        ? '<button id="create-post-btn" class="btn create">Create Post</button>'
        : ""
      }
        <button id="messages-btn" class="btn messages">messages</button>
            <button id="logout-btn" class="btn logout">Logout</button>
        </div>
        `;
  }

  async init() {
    const isAuthorized = await fetcher.isLoggedIn();

    document.getElementById("logo")?.addEventListener("click", () => {
      window.location.href = "/";
    });

    if (isAuthorized) {
      // User-specific buttons
      document.getElementById("create-post-btn")?.addEventListener("click", () => {
        window.location.href = "/create-post";
      });
      document.getElementById("messages-btn")?.addEventListener("click", () => {
        window.location.href = "/chat";
      });

      document.getElementById("logout-btn")?.addEventListener("click", () => {
        Utils.logOut();
      });
    } else {
      // Login/Register buttons
      document.getElementById("login-btn")?.addEventListener("click", () => {
        window.location.href = "/sign-in";
      });

      document.getElementById("register-btn")?.addEventListener("click", () => {
        window.location.href = "/sign-up";
      });
    }

    // WebSocket connection for chat notifications
    if (this.ws.readyState === WebSocket.OPEN) {
      console.log("WebSocket is already open");
    } else {
      this.ws.onopen = () => {
        console.log("Connected to chat server");
      };
    }

    let n = 1;
    this.ws.onmessage = (event) => {
      // add notification to the messages button
      console.log("WebSocket message received:", event.data);
      const data = JSON.parse(event.data);
      if (data.action === "new_message") {
        const messagesBtn = document.querySelector("#messages-btn");
        messagesBtn.classList.add("notification");
        // give this badge a number
        messagesBtn.innerHTML = `messages <span id='badge'>${n++}</span>`;
        messagesBtn.addEventListener("click", () => {
          messagesBtn.classList.remove("notification");
        });
      }
    };

    this.ws.onerror = (event) => {
      console.error("WebSocket error:", event);
    };
  }
}