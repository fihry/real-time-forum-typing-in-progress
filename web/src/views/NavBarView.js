import AbstractView from "./AbstractView.js";
import Utils from "../pkg/Utils.js";
import fetcher from "../pkg/fetcher.js";
import Ws from "../pkg/ws.js";
import redirect from "../index.js";

export default class extends AbstractView {
  constructor(params, user) {
    super(params);
    this.user = user;
    this.ws = {};
  }

  async getHtml() {
    const isAuthorized = await fetcher.isLoggedIn();
    return `
       <a href="/" data-link id="logo" >ZellCode</a>
       <div class="links-menu">
        ${isAuthorized ? `
        <button id="messages-btn" class="btn messages" style="color: #fff;">
             <svg width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M17.98 10.79V14.79C17.98 15.05 17.97 15.3 17.94 15.54C17.71 18.24 16.12 19.58 13.19 19.58H12.79C12.54 19.58 12.3 19.7 12.15 19.9L10.95 21.5C10.42 22.21 9.56 22.21 9.03 21.5L7.82999 19.9C7.69999 19.73 7.41 19.58 7.19 19.58H6.79001C3.60001 19.58 2 18.79 2 14.79V10.79C2 7.86001 3.35001 6.27001 6.04001 6.04001C6.28001 6.01001 6.53001 6 6.79001 6H13.19C16.38 6 17.98 7.60001 17.98 10.79Z"
                  stroke="#ddd" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" />
                <path opacity="0.4"
                  d="M21.9791 6.79001V10.79C21.9791 13.73 20.6291 15.31 17.9391 15.54C17.9691 15.3 17.9791 15.05 17.9791 14.79V10.79C17.9791 7.60001 16.3791 6 13.1891 6H6.78906C6.52906 6 6.27906 6.01001 6.03906 6.04001C6.26906 3.35001 7.85906 2 10.7891 2H17.1891C20.3791 2 21.9791 3.60001 21.9791 6.79001Z"
                  stroke="#ddd" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" />
                <path opacity="0.4" d="M13.4955 13.25H13.5045" stroke="#ffff" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round" />
                <path opacity="0.4" d="M9.9955 13.25H10.0045" stroke="#fff" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round" />
                <path opacity="0.4" d="M6.4955 13.25H6.5045" stroke="#ffff" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round" />
              </svg>
        </button>
        ` : ""
      }
        <label class="hamburger">
        <input type="checkbox" id="togle-input" />
        <svg viewBox="0 0 32 32">
        <path class="line line-top-bottom" d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22">
        </path>
        <path class="line" d="M7 16 27 16"></path>
        </svg>
        </label>
        <div class="links">
         <div id="nav-auth-links" class="${isAuthorized ? "hidden" : "nav-auth-links"}">
        <button id="login-btn" class="btn login" style="color: #fff;">Login</button>
        <button id="register-btn" class="btn register" style="color: #fff;">Register</button>
        </div>
        <div id="nav-user-links" class="${isAuthorized ? "nav-user-links" : "hidden"}">
        <button id="create-post-btn" class="btn create" style="color: #fff;">Create Post</button>
        <button id="logout-btn" class="btn logout" style="color: #fff;">
        Logout
         <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
         <path d="M12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
         <path d="M10 12H20M20 12L17 9M20 12L17 15" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
         </svg>
        </button>
        </div>
        </div>
      </div>
       </div>
      </div>
      `;
  }

  async init() {
    const isAuthorized = await fetcher.isLoggedIn();
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

    // toggle navbar
    const hamburger = document.getElementById("togle-input");
    const links = document.querySelector(".links");
    hamburger.onchange = () => {
      links.classList.toggle("links-active");
      // links.style.display = hamburger.checked ? "block" : "none";
    }
    //init websocket
    Ws.init();
    this.ws = Ws.getWs();
    this.sender = {};
    let n = 1;
    const messagesBtn = document.querySelector("#messages-btn");
    if (messagesBtn) {
      this.ws.onmessage = (event) => {
        console.log("message received");
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