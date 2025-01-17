import AbstractView from "./AbstractView.js";
import Utils from "../pkg/Utils.js";
import fetcher from "../pkg/fetcher.js";

export default class extends AbstractView {
  constructor(params, user) {
    super(params);
    this.user = user;
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
    // }
    // Initialize the ws connection
    const ws = new WebSocket("ws://localhost:8089/api/ws/chat");
    ws.onopen = () => {
      console.log("Connected to chat server");
      setInterval(() => {
        ws.send(JSON.stringify({ action: "ping" }));
      }, 5000); // Send ping every 5 seconds
    };
    let n = 1;
    ws.onmessage = (event) => {
      // add netification to the messages button
      console.log("WebSocket message received:", event.data
      );
      const data = JSON.parse(event.data);
      if (data.action === "new_message") {
        const messagesBtn = document.querySelector("#messages-btn");
        messagesBtn.classList.add("notification");
        // geve this badge a number

        messagesBtn.innerHTML = `messages <span class='badge'>${n++}</span>`;
        messagesBtn.addEventListener("click", () => {
          messagesBtn.classList.remove("notification");
        });
      }
    };
    ws.onerror = (event) => {
      console.error("WebSocket error:", event);
    };


  }
}

