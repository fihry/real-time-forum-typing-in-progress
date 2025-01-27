class WebSocketService {
  constructor() {
    this.ws = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    this.ws = new WebSocket(`ws://${window.location.host}/api/ws/chat`);
    this.ws.onopen = () => {
      console.log(`welcome to the real_time_forum`);
      this.ws.send(JSON.stringify({
        action: "get_user"
      }));
    };
    this.notify();

    this.ws.onclose = () => {
      console.log("WebSocket closed");
    };

    this.isInitialized = true;
  }

  notify() {
    let n = 1;
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.action) {
        case "new_message":
          const messagesBtn = document.querySelector("#messages-btn");
          messagesBtn.classList.add("notification");
          messagesBtn.innerHTML = `messages <span class='badge'>${n++}</span>`;
          messagesBtn.addEventListener("click", () => {
            messagesBtn.classList.remove("notification");
          });

          // play raciving message sound
          const audio = new Audio("/src/assets/audio/receiving.mp3");
          audio.play();
          break;
        case "new_user":
          console.log("New user registered");
          break;
        case "status_change":
          console.log("User status changed");
          break;
      }
    }
  }

  getWs() {
    return this.ws;
  }

  close() {
    this.ws.close();
    this.isInitialized = false;
  }

  isReady() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

export default new WebSocketService();