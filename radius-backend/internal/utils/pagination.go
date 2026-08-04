// radius-backend/internal/utils/pagination.go
package utils

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

func ParsePagination(ctx *gin.Context) (pageNumber int, pageSize int) {
	pageNumber = 1
	pageSize = DEFAULT_PAGING_SIZE

	if n, err := strconv.Atoi(ctx.DefaultQuery("page_number", "1")); err == nil && n >= 1 {
		pageNumber = n
	}
	if s, err := strconv.Atoi(ctx.DefaultQuery("page_size", "10")); err == nil && s >= PAGING_SIZE_MINIMUM && s <= PAGING_SIZE_MAXIMUM {
		pageSize = s
	}

	return pageNumber, pageSize
}
