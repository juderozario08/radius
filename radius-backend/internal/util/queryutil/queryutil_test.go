package queryutil

import (
	"reflect"
	"testing"
)

func TestBuildWhereClause(t *testing.T) {
	if got := BuildWhereClause(nil); got != "WHERE 1=1" {
		t.Fatalf("expected 'WHERE 1=1', got '%s'", got)
	}

	conds := []string{"a = $1", "b = $2"}
	if got := BuildWhereClause(conds); got != "WHERE a = $1 AND b = $2" {
		t.Fatalf("unexpected where clause: %s", got)
	}
}

func TestBuilder_AddAndWhereClause(t *testing.T) {
	b := NewBuilder(10)
	b.Add("name ILIKE $%d", "%test%")
	b.Add("(from_store = $%d OR to_store = $%d)", 2, 2)

	expectedWhere := "WHERE name ILIKE $2 AND (from_store = $3 OR to_store = $4)"
	if got := b.WhereClause(); got != expectedWhere {
		t.Fatalf("expected '%s', got '%s'", expectedWhere, got)
	}

	expectedArgs := []any{10, "%test%", 2, 2}
	if !reflect.DeepEqual(b.Args(), expectedArgs) {
		t.Fatalf("expected args %v, got %v", expectedArgs, b.Args())
	}
}

func TestBuilder_Paginate(t *testing.T) {
	b := NewBuilder()
	b.Add("status = $%d", "ACTIVE")

	paginationClause := b.Paginate(25, 50)
	expectedClause := "LIMIT $2 OFFSET $3"
	if paginationClause != expectedClause {
		t.Fatalf("expected '%s', got '%s'", expectedClause, paginationClause)
	}

	expectedArgs := []any{"ACTIVE", 25, 50}
	if !reflect.DeepEqual(b.Args(), expectedArgs) {
		t.Fatalf("expected args %v, got %v", expectedArgs, b.Args())
	}
}

func TestBuilder_AddWithSameArg(t *testing.T) {
	b := NewBuilder(1)
	b.AddWithSameArg("(a = $%d OR b = $%d OR c = $%d)", "val")

	expectedWhere := "WHERE (a = $2 OR b = $2 OR c = $2)"
	if got := b.WhereClause(); got != expectedWhere {
		t.Fatalf("expected '%s', got '%s'", expectedWhere, got)
	}

	expectedArgs := []any{1, "val"}
	if !reflect.DeepEqual(b.Args(), expectedArgs) {
		t.Fatalf("expected args %v, got %v", expectedArgs, b.Args())
	}
}
