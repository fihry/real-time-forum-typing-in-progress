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
          <span class="badge"></span>
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
  }
}