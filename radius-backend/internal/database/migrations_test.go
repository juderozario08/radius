package database_test

import (
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"testing"
)

func TestMigrations_NamingSequenceAndSafety(t *testing.T) {
	migrationsDir := "../../migrations"
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		t.Fatalf("Failed to read migrations directory %s: %v", migrationsDir, err)
	}

	upPattern := regexp.MustCompile(`^(\d{6})_([a-zA-Z0-9_-]+)\.up\.sql$`)
	downPattern := regexp.MustCompile(`^(\d{6})_([a-zA-Z0-9_-]+)\.down\.sql$`)

	upVersions := make(map[int]string)
	downVersions := make(map[int]string)

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()

		var versionNum int
		if matches := upPattern.FindStringSubmatch(name); matches != nil {
			v, _ := strconv.Atoi(matches[1])
			versionNum = v
			if _, exists := upVersions[v]; exists {
				t.Errorf("Duplicate up migration version: %06d", v)
			}
			upVersions[v] = name
		} else if matches := downPattern.FindStringSubmatch(name); matches != nil {
			v, _ := strconv.Atoi(matches[1])
			versionNum = v
			if _, exists := downVersions[v]; exists {
				t.Errorf("Duplicate down migration version: %06d", v)
			}
			downVersions[v] = name
		}

		fullPath := filepath.Join(migrationsDir, name)
		contentBytes, readErr := os.ReadFile(fullPath)
		if readErr != nil {
			t.Errorf("Failed to read %s: %v", name, readErr)
			continue
		}
		content := string(contentBytes)
		dropCoreTablePattern := regexp.MustCompile(`(?i)drop\s+table\s+(if\s+exists\s+)?(stores|employees)\b`)
		if strings.HasSuffix(name, ".up.sql") && dropCoreTablePattern.MatchString(content) {
			t.Fatalf("CRITICAL SAFETY VIOLATION in %s: migrations must NEVER drop Stores or Employees tables", name)
		}
		if versionNum > 3 && dropCoreTablePattern.MatchString(content) {
			t.Fatalf("CRITICAL SAFETY VIOLATION in %s: migrations must NEVER drop Stores or Employees tables", name)
		}
	}

	for v, upFile := range upVersions {
		if _, hasDown := downVersions[v]; !hasDown {
			t.Errorf("Migration %s (%06d) is missing its corresponding .down.sql file", upFile, v)
		}
	}

	for v, downFile := range downVersions {
		if _, hasUp := upVersions[v]; !hasUp {
			t.Errorf("Migration %s (%06d) is missing its corresponding .up.sql file", downFile, v)
		}
	}

	var sortedVersions []int
	for v := range upVersions {
		sortedVersions = append(sortedVersions, v)
	}
	sort.Ints(sortedVersions)

	for i := 0; i < len(sortedVersions); i++ {
		expected := i + 1
		if sortedVersions[i] != expected {
			t.Errorf("Migration version gap or out-of-order: expected %06d, got %06d", expected, sortedVersions[i])
		}
	}
}
