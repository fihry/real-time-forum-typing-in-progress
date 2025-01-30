import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
  constructor(params, user) {
    super(params);
    this.user = user;
    this.events = [];
    this.categorySelector = this.categorySelector.bind(this);
  }

  async getHtml() {
    const categories = (await this.getCategories()) || [];
    const isAuthorized = Boolean(this.user.id);

    let sidebarHtml = /*html*/ `
      <div id="sidebar" class="sidebar">
        ${isAuthorized
        ? `
          <div class="sidebar-section">
            <div class="sidebar-section-title">My Posts</div>
            <div class="sidebar-menu-item" data-category="my-posts">My Posts</div>
            <div class="sidebar-menu-item" data-category="liked-posts">Liked Posts</div>
            <div class="sidebar-menu-item" data-category="disliked-posts">Disliked Posts</div>
          </div>
        `
      : ""
      }

        <div class="sidebar-section">
          <div class="sidebar-section-title">Discover Categories</div>
          ${categories
      .map(
        (category) => `
            <div class="sidebar-menu-item" data-category="${category.name}">
              ${category.name}
            </div>
          `
    )
      .join("")}
        </div>
        <div class="togel-sidbar">
          <button id="togel-sidbar" class="togel">
          Filter by catigores
          <svg xmlns="http://www.w3.org/2000/svg" id="Outline" viewBox="0 0 24 24" width="20px" height="20px">
            <path fill="#ffff" d="M1,4.75H3.736a3.728,3.728,0,0,0,7.195,0H23a1,1,0,0,0,0-2H10.931a3.728,3.728,0,0,0-7.195,0H1a1,1,0,0,0,0,2ZM7.333,2a1.75,1.75,0,1,1-1.75,1.75A1.752,1.752,0,0,1,7.333,2Z" />
            <path fill="#ffff" d="M23,11H20.264a3.727,3.727,0,0,0-7.194,0H1a1,1,0,0,0,0,2H13.07a3.727,3.727,0,0,0,7.194,0H23a1,1,0,0,0,0-2Zm-6.333,2.75A1.75,1.75,0,1,1,18.417,12,1.752,1.752,0,0,1,16.667,13.75Z" />
            <path fill="#ffff" d="M23,19.25H10.931a3.728,3.728,0,0,0-7.195,0H1a1,1,0,0,0,0,2H3.736a3.728,3.728,0,0,0,7.195,0H23a1,1,0,0,0,0-2ZM7.333,22a1.75,1.75,0,1,1,1.75-1.75A1.753,1.753,0,0,1,7.333,22Z" />
            </svg>
          </button>
        </div>
      </div>
    `;

    return sidebarHtml;
  }

  async init() {
    const sidebarItems = document.querySelectorAll(".sidebar-menu-item");
    sidebarItems.forEach((item) => {

      item.addEventListener("click", this.categorySelector);
    })
    // Toggle sidebar
    const check = document.querySelector("#togel-sidbar");
    if (check) {
      check.addEventListener("click", () => {
        const sidebarSection = document.querySelectorAll(".sidebar-section");
        sidebarSection.forEach((item) => {
          item.style.display = item.style.display === "block" ? "none" : "block";
          // on resize
          window.addEventListener("resize", () => {
            if (window.innerWidth > 768) {
              item.style.display = "block";
            }
          }
          );
        });
      });
    }
  }

  categorySelector(e) {
    const category = e.target.getAttribute("data-category");
    // Dispatch a custom event that HomeView can listen to
    const event = new CustomEvent("category-selected", {
      detail: { category: category },
    });
    document.dispatchEvent(event);
  }
}
