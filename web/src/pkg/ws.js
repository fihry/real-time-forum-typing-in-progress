class WebSocketService {
  static ws = null;
  static isInitialized = false;


  init() {
    if (WebSocketService.isInitialized) return;
    WebSocketService.ws = new WebSocket(`ws://${window.location.host}/api/ws/chat`);
    WebSocketService.ws.onopen = () => {
      console.log(`welcome to the real_time_forum`);
      WebSocketService.ws.send(JSON.stringify({
        action: "get_user"
      }));
    };

    WebSocketService.ws.onclose = () => {
      console.log("WebSocket closed");
    };

    WebSocketService.isInitialized = true;
  }

  notify() {
    let n = 1;
    WebSocketService.ws.onmessage = (event) => {
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
    return WebSocketService.ws;
  }


  close() {
    WebSocketService.ws.close();
    WebSocketService.isInitialized = false;
  }

  isReady() {
    return WebSocketService.ws && WebSocketService.ws.readyState === WebSocket.OPEN;
  }
}

export default new WebSocketService();