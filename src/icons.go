package main

import (
	"os"
	"path/filepath"
	"strings"
)

// iconsDir is an "icons" folder next to the .exe where people can drop their own pictures.
func iconsDir() string {
	exe, err := os.Executable()
	if err != nil {
		return filepath.Join(appDir(), "icons")
	}
	return filepath.Join(filepath.Dir(exe), "icons")
}

// listIcons maps a normalised monster name (e.g. "reydau") to a file name.
func listIcons() map[string]string {
	out := map[string]string{}
	ents, err := os.ReadDir(iconsDir())
	if err != nil {
		return out
	}
	for _, e := range ents {
		n := e.Name()
		ext := strings.ToLower(filepath.Ext(n))
		if ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".webp" && ext != ".gif" {
			continue
		}
		out[normName(strings.TrimSuffix(n, filepath.Ext(n)))] = n
	}
	return out
}

func normName(s string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(s) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
	}
	return b.String()
}
