-- this table is used to store the chat messages

CREATE TABLE  IF NOT EXISTS  messages(
    id SERIAL PRIMARY KEY,
    receiver_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (receiver_id) REFERENCES users(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
);