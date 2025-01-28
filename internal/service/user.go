package service

import (
	"context"
	"errors"
	"net/http"

	"forum/internal/entity"
	"forum/internal/repository"
	smpljwt "forum/pkg/smplJwt"
	"forum/pkg/utils"
)

type UserService struct {
	userRepo    repository.User
	sessionRepo repository.Session
	secret      string
}

func newUserService(userRepo repository.User, sessionRepo repository.Session, secret string) *UserService {
	return &UserService{
		userRepo:    userRepo,
		sessionRepo: sessionRepo,
		secret:      secret,
	}
}

func (s *UserService) Create(ctx context.Context, user entity.User) (int, error) {
	if err := utils.IsValidRegister(&user); err != nil {
		return http.StatusBadRequest, err
	}

	status, err := s.userRepo.Create(ctx, user)
	if status == http.StatusBadRequest {
		switch err.Error() {
		case "UNIQUE constraint failed: users.email":
			return status, errors.New("already email is using")
		case "UNIQUE constraint failed: users.nickname":
			return status, errors.New("already nickname is using")
		}
	}
	return status, err
}

func (s *UserService) SignIn(ctx context.Context, user entity.User) (string, int, error) {
	if user.Email == "" || user.Password == "" {
		return "", http.StatusBadRequest, errors.New("invalid credentials")
	}

	if err:= utils.IsValidEmail(&user); err != nil {
		user.Nickname = user.Email
		user.Email = ""
	}

	switch {
		case user.Email!= "":
            return s.signInByEmail(ctx, user)
        case user.Nickname!= "":
            return s.signInByNickname(ctx, user)
        default:
            return "", http.StatusBadRequest, errors.New("invalid email or nickname")
	}

}

func (s *UserService) signInByEmail(ctx context.Context, user entity.User) (string, int, error) {
	repoUserStruct, status, err := s.userRepo.GetUserIDByEmail(ctx, user.Email)
	if err != nil {
		if status == http.StatusBadRequest {
			return "", status, errors.New("invalid email or password")
		}
		return "", status, err
	}
	if err := utils.CompareHashAndPassword(repoUserStruct.Password, user.Password); err != nil {
		return "", http.StatusBadRequest, errors.New("invalid password")
	}
	token, err := smpljwt.NewJWT(repoUserStruct.ID, s.secret)
	if err != nil {
		return "", http.StatusInternalServerError, err
	}

	if status, err = s.sessionRepo.PostSession(ctx, entity.Session{
		UserID: repoUserStruct.ID,
		Token:  token,
	}); err != nil {
		return "", status, err
	}
	return token, http.StatusOK, nil
}

func (s *UserService) signInByNickname(ctx context.Context, user entity.User) (string, int, error) {
	repoUserStruct, status, err := s.userRepo.GetUserByNickName(ctx, user.Nickname)
    if err != nil {
        if status == http.StatusBadRequest {
            return "", status, errors.New("invalid nickname or password")
        }
        return "", status, err
    }
	if err := utils.CompareHashAndPassword(repoUserStruct.Password, user.Password); err != nil {
		return "", http.StatusBadRequest, errors.New("invalid password")
	}
	token, err := smpljwt.NewJWT(repoUserStruct.ID, s.secret)
	if err != nil {
		return "", http.StatusInternalServerError, err
	}

	if status, err = s.sessionRepo.PostSession(ctx, entity.Session{
		UserID: repoUserStruct.ID,
		Token:  token,
	}); err != nil {
		return "", status, err
	}
	return token, http.StatusOK, nil
}