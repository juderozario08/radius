package auth

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func RequireAuth(ctx *gin.Context) {
	auth := ctx.GetHeader("Auth")
	if auth == "" {
		fmt.Println("No Auth Found")
		ctx.JSON(http.StatusUnauthorized, gin.H{"message": "You are not authorized"})
		return
	}
	split := strings.Split(auth, " ")
	if len(split) != 2 {
		fmt.Println("Invalid Auth Header Format! Expected 'Bearer <TOKEN>'")
		ctx.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid Auth Header Format! Expected \"Bearer <TOKEN>\""})
		return
	}

	token := split[1]
	if token == "" || token != "Token" {
		fmt.Println("Invalid token: ", token)
		ctx.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid token!"})
		return
	}
	fmt.Println("Welcome " + ctx.ClientIP() + "!")
}
