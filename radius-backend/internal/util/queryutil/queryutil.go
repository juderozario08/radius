package queryutil

import (
	"fmt"
	"strings"
)

type Pagination struct {
	Limit  int
	Offset int
}

func BuildWhereClause(conditions []string) string {
	if len(conditions) == 0 {
		return "WHERE 1=1"
	}
	return "WHERE " + strings.Join(conditions, " AND ")
}

func AppendCondition(conditions []string, args []interface{}, condition string, arg interface{}) ([]string, []interface{}) {
	conditions = append(conditions, condition)
	args = append(args, arg)
	return conditions, args
}

func PaginateQuery(query string, limit, offset int, argIdx int) (string, []interface{}) {
	paginatedQuery := fmt.Sprintf("%s LIMIT $%d OFFSET $%d", query, argIdx, argIdx+1)
	return paginatedQuery, []interface{}{limit, offset}
}

type Builder struct {
	conditions []string
	args       []any
}

func NewBuilder(initialArgs ...any) *Builder {
	b := &Builder{
		conditions: make([]string, 0),
		args:       make([]any, 0, len(initialArgs)),
	}
	b.args = append(b.args, initialArgs...)
	return b
}

func (b *Builder) NextArgIndex() int {
	return len(b.args) + 1
}

func (b *Builder) Add(clauseFormat string, args ...any) *Builder {
	if len(args) == 0 {
		b.conditions = append(b.conditions, clauseFormat)
		return b
	}

	indices := make([]any, len(args))
	for i := range args {
		b.args = append(b.args, args[i])
		indices[i] = len(b.args)
	}

	clause := clauseFormat
	if strings.Contains(clauseFormat, "%d") {
		clause = fmt.Sprintf(clauseFormat, indices...)
	}
	b.conditions = append(b.conditions, clause)
	return b
}

func (b *Builder) AddWithSameArg(clauseFormat string, arg any) *Builder {
	b.args = append(b.args, arg)
	idx := len(b.args)
	count := strings.Count(clauseFormat, "%d")
	indices := make([]any, count)
	for i := 0; i < count; i++ {
		indices[i] = idx
	}
	clause := fmt.Sprintf(clauseFormat, indices...)
	b.conditions = append(b.conditions, clause)
	return b
}

func (b *Builder) WhereClause() string {
	if len(b.conditions) == 0 {
		return "WHERE 1=1"
	}
	return "WHERE " + strings.Join(b.conditions, " AND ")
}

func (b *Builder) WhereClauseEmptyIfNone() string {
	if len(b.conditions) == 0 {
		return ""
	}
	return "WHERE " + strings.Join(b.conditions, " AND ")
}

func (b *Builder) AndClause() string {
	if len(b.conditions) == 0 {
		return ""
	}
	return "AND " + strings.Join(b.conditions, " AND ")
}

func (b *Builder) Args() []any {
	return b.args
}

func (b *Builder) Paginate(limit, offset int) string {
	idx1 := len(b.args) + 1
	idx2 := len(b.args) + 2
	b.args = append(b.args, limit, offset)
	return fmt.Sprintf("LIMIT $%d OFFSET $%d", idx1, idx2)
}
