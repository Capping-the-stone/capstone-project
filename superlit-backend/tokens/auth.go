package tokens

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// this function creates a token on sign in. All subsequent authorized requests
// must use this token
func CreateSignInToken(userID uint, universityID string, isTeacher bool, name string, email string) (string, error) {
	ttl := 30 * 24 * time.Hour // 30 days

	token := jwt.NewWithClaims(jwt.SigningMethodHS256,
		jwt.MapClaims{
			"userID":       userID,
			"universityID": universityID,
			"name":         name,
			"email":        email,
			"isTeacher":    isTeacher,
			"exp":          time.Now().Add(ttl).Unix(),
		})

	signedToken, err := token.SignedString(JWT_SECRET)

	if err != nil {
		return "", err
	}

	return signedToken, nil
}

func VerifyToken(c *gin.Context) {
	tokenString := c.GetHeader("Authorization")
	if tokenString == "" {
		log.Println("No token provided")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		c.Abort()
		return
	}
	claims := jwt.MapClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return JWT_SECRET, nil
	})

	if err != nil {
		log.Println("Error parsing token: ", err)
		c.JSON(401, gin.H{"error": "Unauthorized"})
		c.Abort()
		return
	}
	if !token.Valid {
		log.Println("Token not valid")
		c.JSON(401, gin.H{"error": "Unauthorized"})
		c.Abort()
		return
	}
	c.Set("claims", claims)
	c.Next()
}
