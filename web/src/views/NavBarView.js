import AbstractView from "./AbstractView.js";
import Utils from "../pkg/Utils.js";
import fetcher from "../pkg/fetcher.js";
import Ws from "../pkg/ws.js";
import redirect from "../index.js";

export default class extends AbstractView {
  constructor(params, user) {
    super(params);
    this.user = user;
    this.ws = Ws.getWs();
  }

  async getHtml() {
    const isAuthorized = await fetcher.isLoggedIn();
    return `
       <a id="logo" data-link href="/">Real Time Forum</a>
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
      let btns = document.querySelectorAll(".btn");
      btns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          switch (e.target.id) {
            case "create-post-btn":
              redirect.navigateTo("/create-post");
              break;
            case "messages-btn":
              redirect.navigateTo("/chat");
              break;
            case "logout-btn":
              Utils.logOut();
              break;
            case "login-btn":
              redirect.navigateTo("/sign-in");
              break;
            case "register-btn":
              redirect.navigateTo("/sign-up");
              break;
            default:
              break;
          }
        });
      })
    }
    // WebSocket connection for chat notifications
    this.ws.onopen = () => {
      alert("WebSocket connection established");
      console.log('WebSocket connection established');
    };
    let n = 1;
    const messagesBtn = document.querySelector("#messages-btn");
    if (messagesBtn) {
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.action === "new_message") {
          messagesBtn.classList.add("notification");
          // give this badge a number
          messagesBtn.innerHTML = `messages <span id='badge'>${n++}</span>`;
          messagesBtn.addEventListener("click", () => {
            messagesBtn.classList.remove("notification");
          });
        }
      };
    }

    this.ws.onerror = (event) => {
      console.error("WebSocket error:", event);
    };
  }
}