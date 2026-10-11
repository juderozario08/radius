package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

func pathID(ctx *gin.Context, name string) (int, bool) {
	id, err := strconv.Atoi(ctx.Param(name))
	return id, err == nil && id > 0
}
