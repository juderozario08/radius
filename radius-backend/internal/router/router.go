package router

import (
	"net/http"
	"radius/internal/handler"
	"radius/internal/middleware"

	"github.com/gin-gonic/gin"
)

func NewRouter() *gin.Engine {
	router := gin.Default()

	router.GET("/health", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{
			"status":  http.StatusOK,
			"message": "Server is working!",
		})
	})

	router.POST("/register", handler.Register)
	router.POST("/login", handler.Login)

	api := router.Group("/api")
	api.Use(middleware.RequireAuth())
	{
		api.POST("/logout", handler.Logout)
	}

	return router
}
