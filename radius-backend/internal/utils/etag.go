package utils

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func GenerateETag(data []byte) string {
	hash := sha256.Sum256(data)
	return `"` + hex.EncodeToString(hash[:16]) + `"`
}

func RenderJSONWithETag(c *gin.Context, status int, data any, cacheControlDirective string) {
	serialized, err := json.Marshal(data)
	if err != nil {
		c.JSON(status, data)
		return
	}

	etag := GenerateETag(serialized)

	c.Header("ETag", etag)
	if cacheControlDirective != "" {
		c.Header("Cache-Control", cacheControlDirective)
	} else {
		c.Header("Cache-Control", "private, must-revalidate")
	}
	c.Header("Vary", "Accept-Encoding")

	ifNoneMatch := c.GetHeader("If-None-Match")
	if ifNoneMatch != "" && (ifNoneMatch == etag || strings.Contains(ifNoneMatch, etag)) {
		c.Status(http.StatusNotModified)
		c.Writer.WriteHeaderNow()
		return
	}

	c.Data(status, "application/json; charset=utf-8", serialized)
}
