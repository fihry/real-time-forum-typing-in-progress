package server

import (
	"log"
	"net/http"

	"forum/pkg/config"
)

type Server struct {
	httpServer *http.Server
}

func (s *Server) Run(c *config.API, handler http.Handler) error {
	// Prepare server
	s.httpServer = &http.Server{
		Addr:    c.Host + ":" + c.Port,
		Handler: handler,
	}
	// Start listening server
	log.Printf("\033[32mServer is running...🚀\nLink: 🌐 http://%s", s.httpServer.Addr)
	return s.httpServer.ListenAndServe()
}
