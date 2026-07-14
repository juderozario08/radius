package utils

import (
	"crypto/sha256"
	"encoding/hex"
)

func HashTokenForDB(token string) string {
	t := sha256.Sum256([]byte(token))
	hash := hex.EncodeToString(t[:])
	return hash
}
