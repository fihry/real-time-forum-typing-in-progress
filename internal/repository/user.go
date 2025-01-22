package repository

import (
	"context"
	"database/sql"
	"net/http"

	"forum/internal/entity"
)

type UserRepository struct {
	db *sql.DB
}

func newUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, user entity.User) (int, error) {
	query := `INSERT INTO users(nickname, email, firstName, lastName, age, gender, hashPass)
	VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id;`
	prep, err := r.db.PrepareContext(ctx, query)
	if err != nil {
		return http.StatusInternalServerError, err
	}
	defer prep.Close()
	if _, err = prep.ExecContext(ctx, user.Nickname, user.Email, user.FirstName, user.LastName, user.Age, user.Gender, user.Password); err != nil {
		return http.StatusBadRequest, err
	}
	return http.StatusCreated, nil
}

func (r *UserRepository) GetUserByID(ctx context.Context, id uint) (entity.Contact, int, error) {
	query := `SELECT id, nickname, email, firstName , lastName , gender , age FROM users WHERE id = $1 LIMIT 1;`
	prep, err := r.db.PrepareContext(ctx, query)
	Contact := entity.Contact{}
	if err != nil {
		return Contact, http.StatusInternalServerError, err
	}
	defer prep.Close()
	if err:= prep.QueryRowContext(ctx, id).Scan(&Contact.ID,&Contact.Nickname, &Contact.Email, &Contact.FirstName, &Contact.LastName ,&Contact.Gender,&Contact.Age); err != nil {
		return Contact, http.StatusBadRequest, err
	}
	return Contact, http.StatusOK, nil
}

func (r *UserRepository) GetUserIDByEmail(ctx context.Context, email string) (entity.User, int, error) {
	query := `SELECT id, hashPass FROM users WHERE email = $1 LIMIT 1;`
	prep, err := r.db.PrepareContext(ctx, query)
	user := entity.User{}
	if err != nil {
		return user, http.StatusInternalServerError, err
	}
	defer prep.Close()

	if err = prep.QueryRowContext(ctx, email).Scan(&user.ID, &user.Password); err != nil {
		return user, http.StatusBadRequest, err
	}
	return user, http.StatusOK, nil
}
