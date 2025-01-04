package service

import (
	"context"

	"forum/internal/entity"
	"forum/internal/repository"
)

type MessageService struct {
	messageRepo repository.Message
}

func newMessageService(messageRepo repository.Message) *MessageService {
	return &MessageService{messageRepo: messageRepo}
}

func (s *MessageService) GetAllContacts(ctx context.Context, userID uint) ([]entity.Contact, int, error) {
	return s.messageRepo.GetAllContacts(ctx, userID)
}

func (s *MessageService) CreateMessage(ctx context.Context, input entity.Message) (int, error) {
	return s.messageRepo.CreateMessage(ctx, input)
}

func (s *MessageService) GetAllMessagesByUserID(ctx context.Context, userID uint, limit, offset int) ([]entity.Message, int, error) {
	return s.messageRepo.GetAllMessagesByUserID(ctx, userID, limit, offset)
}

func (s *MessageService) GetAllUnreadMessagesByUserID(ctx context.Context, userID uint, limit, offset int) ([]entity.Message, int, error) {
	return s.messageRepo.GetAllUnreadMessagesByUserID(ctx, userID, limit, offset)
}

func (s *MessageService) GetMessageByID(ctx context.Context, messageID uint) (entity.Message, int, error) {
	return s.messageRepo.GetMessageByID(ctx, messageID)
}
