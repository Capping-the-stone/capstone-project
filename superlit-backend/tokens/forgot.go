package tokens

import (
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/anuragrao04/superlit-backend/database"
	"github.com/anuragrao04/superlit-backend/models"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var JWT_SECRET []byte

func CreateForgotLink(universityID string) (link string, user *models.User, err error) {
	// first we see if there is a user with the given ID
	if database.DB == nil {
		log.Println("DB is nil. Not connected to database")
	}
	database.DBLock.Lock()
	defer database.DBLock.Unlock()
	err = database.DB.Where("university_id = ?", universityID).First(&user).Error

	// guard clause to get out if user does not exist
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "", nil, errors.New("User doesn't exist")
	}

	// user.Password is an encrypted version of the password.
	// we make a unique signing key for each user with current password
	uniqueKey := []byte(string(JWT_SECRET) + user.Password)
	// log.Println("Signing with ", string(uniqueKey))

	// this way, when the user later changes his password, the token is automatically invalidated.
	// This is because the password is part of the key used to sign the token.

	// we will verify the signature at the time of reset password using this key
	ttl := 15 * time.Minute

	token := jwt.NewWithClaims(jwt.SigningMethodHS256,
		jwt.MapClaims{
			"universityID": user.UniversityID,
			"userID":       user.ID,
			"exp":          time.Now().Add(ttl).Unix(),
		})

	if err != nil {
		log.Fatal(err)
	}
	signedToken, err := token.SignedString(uniqueKey)

	if err != nil {
		return "", nil, err
	}

	FRONTEND_FORGOT_PASS_URL := os.Getenv("FRONTEND_FORGOT_PASS_URL")
	// the ENV Variable must include the http(s):// prefix along with the path to the forgot password page
	// for example https://superlit.vercel.app/auth/forgotpassword/
	// INCLUDE TRAILING SLASH!

	link = FRONTEND_FORGOT_PASS_URL + signedToken

	return link, user, nil
}

// this function first verifies that the token is valid
// If valid, it changes the password.
// If not, it returns an error
func ResetPassword(tokenString, newPassword string) error {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {

		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
		}

		// check if the user exists
		var user models.User
		database.DBLock.Lock()
		defer database.DBLock.Unlock()
		err := database.DB.Where("id = ?", token.Claims.(jwt.MapClaims)["userID"]).First(&user).Error
		if err != nil {
			return nil, errors.New("User not found")
		}
		// see the comment in CreateForgotLink for why we use the password here
		log.Println("Verifying with ", string(JWT_SECRET)+user.Password)
		return []byte(string(JWT_SECRET) + user.Password), nil
	})

	if err != nil {
		log.Println(err)
		return err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return errors.New("Invalid token")
	}

	universityID, userID, expiry := claims["universityID"], claims["userID"], claims["exp"]

	if time.Now().Unix() > int64(expiry.(float64)) {
		// token has expired
		return errors.New("Token has expired")
	}

	// Now that we have validated both the token and the expiry, we can change the password
	// TODO: Move this to the auth.go file in the database package

	bytePassword := []byte(newPassword)
	hashedPassword, err := bcrypt.GenerateFromPassword(bytePassword, bcrypt.DefaultCost)

	err = database.DB.Model(&models.User{}).Where("id = ?", userID).Update("password", hashedPassword).Error

	// if there is an error, we return it. Else it returns nil
	if err != nil {
		log.Println(err)
	} else {
		log.Println("changed password for user with university ID", universityID)
	}

	return nil
}

func LoadPrivateKey() error {
	if os.Getenv("JWT_SECRET") == "" {
		return errors.New("JWT_SECRET not found in ENV")
	}
	JWT_SECRET = []byte(os.Getenv("JWT_SECRET"))
	return nil
}
