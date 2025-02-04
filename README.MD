# Forum Web Application

A modern web forum application built with Go backend and vanilla JavaScript frontend that supports real-time chat, post creation, commenting, and user authentication.

## Features

- **Authentication**

  - User registration and login
  - JWT-based authentication
  - Session management

- **Posts**

  - Create, read posts
  - Categorize posts
  - Like/dislike posts
  - Comment on posts
  - Post filtering by categories

- **Real-time Chat**

  - WebSocket-based chat functionality
  - Real-time message notifications
  - Online status indicators
  - Typing indicators

- **Responsive Design**
  - Mobile-friendly interface
  - Dark theme
  - Modern UI components

## Tech Stack

- **Backend**

  - Go 1.22.3
  - SQLite3 database
  - Gorilla WebSocket
  - Custom JWT implementation

- **Frontend**
  - Vanilla JavaScript (ES6+)
  - CSS3 with custom properties
  - HTML5
  - WebSocket API

## Getting Started

1. Clone the repository

2. Run the application:

```sh
go run .
```

3. Access the application at `http://localhost:8080`
4. auto run docker container

```sh
./builder.sh
```

## project stucture
```yml
├── config/ # Application configuration
├── internal/ # Internal application code
│ ├── app/ # Application initialization
│ ├── controller/ # HTTP handlers
│ ├── entity/ # Domain entities
│ ├── repository/ # Data access layer
│ ├── server/ # Server setup
│ └── service/ # Business logic
├── migrations/ # Database migrations
├── pkg/ # Shared packages
└── web/ # Frontend assets
├── src/ # JavaScript source
└── index.html # Main HTML template
```
