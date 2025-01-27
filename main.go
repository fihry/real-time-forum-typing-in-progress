package main

import (
	"log"

	"forum/internal/app"
	"forum/pkg/config"
)

func main() {
	defer func() {
		if r := recover(); r != nil {
		log.Println("i recovered from panic")
	}}()
	
	cfg, err := config.NewConfig()
	if err != nil {
		log.Fatalf("Config error: %s", err)
	}
	app.Run(cfg)
}
