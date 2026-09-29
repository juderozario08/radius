package queryutil

import (
	"fmt"
	"strings"
)

// Pagination represents limit and offset
type Pagination struct {
	Limit  int
	Offset int
}

// BuildWhereClause constructs a WHERE string and argument list from conditions
// Example: BuildWhereClause([]string{"name ILIKE $1", "category_id = $2"}, []interface{}{"%test%", 1})
// Returns: "WHERE name ILIKE $1 AND category_id = $2", args
func BuildWhereClause(conditions []string) string {
	if len(conditions) == 0 {
		return "WHERE 1=1"
	}
	return "WHERE " + strings.Join(conditions, " AND ")
}

// AppendCondition appends a condition and returns the new argument index
func AppendCondition(conditions []string, args []interface{}, condition string, arg interface{}) ([]string, []interface{}) {
	conditions = append(conditions, condition)
	args = append(args, arg)
	return conditions, args
}

// PaginateQuery appends LIMIT and OFFSET to a query
func PaginateQuery(query string, limit, offset int, argIdx int) (string, []interface{}) {
	paginatedQuery := fmt.Sprintf("%s LIMIT $%d OFFSET $%d", query, argIdx, argIdx+1)
	return paginatedQuery, []interface{}{limit, offset}
}
