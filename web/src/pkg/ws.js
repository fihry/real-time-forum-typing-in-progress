class WebSocketService {
  static ws = null;
  static isInitialized = false;


  init() {
    if (WebSocketService.isInitialized) return;
    WebSocketService.ws?.close();
    WebSocketService.ws = new WebSocket(`ws://${window.location.host}/api/ws/chat`);
    WebSocketService.isInitialized = true;
    console.log("WebSocket initialized", WebSocketService.ws);
    WebSocketService.ws.onopen = () => {
      console.log(`welcome to the real_time_ZellCode`);
      WebSocketService.ws.send(JSON.stringify({
        action: "get_user"
      }));
    };
    this.notify();
    WebSocketService.ws.onclose = () => {
      WebSocketService.isInitialized = false;
      console.log("WebSocket closed");
    };

  }

  deinitialize() {
    WebSocketService.isInitialized = false;
  }

  notify() {
    let n = 1;
    WebSocketService.ws.addEventListener("message", event => {
      const data = JSON.parse(event.data);
      switch (data.action) {
        case "new_message":
          const messagesBtn = document.querySelector("#messages-btn");
          messagesBtn.classList.add("notification");
          const badge = document.querySelector('.badge');
          badge.innerText = n++;
          messagesBtn.addEventListener("click", () => {
            messagesBtn.classList.remove("notification");
            badge.innerText = "";
            n = 1;
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
    });
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