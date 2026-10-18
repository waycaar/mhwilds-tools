package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"time"
)

type Theme struct {
	H1 int `json:"h1"`
	H2 int `json:"h2"`
}

type Config struct {
	GamePath string          `json:"gamePath"`
	Theme    *Theme          `json:"theme,omitempty"`
	Prefs    json.RawMessage `json:"prefs,omitempty"` // settings window: tabs, text size, accessibility
}

func appDir() string {
	d, err := os.UserConfigDir()
	if err != nil {
		d = "."
	}
	p := filepath.Join(d, "MHWildsQuestMaker")
	os.MkdirAll(p, 0o755)
	return p
}

func loadConfig() Config {
	var c Config
	b, err := os.ReadFile(filepath.Join(appDir(), "config.json"))
	if err == nil {
		json.Unmarshal(b, &c)
	}
	return c
}

func saveConfig(c Config) error {
	b, _ := json.MarshalIndent(c, "", "  ")
	return os.WriteFile(filepath.Join(appDir(), "config.json"), b, 0o644)
}

func questsDir(game string) string {
	return filepath.Join(game, "reframework", "plugins", "PermanentEventQuest", "quests")
}

type GameCheck struct {
	Path         string `json:"path"`
	GameFound    bool   `json:"gameFound"`
	REFramework  bool   `json:"reframework"`
	PEQInstalled bool   `json:"peqInstalled"`
	QuestsDir    string `json:"questsDir"`
	Message      string `json:"message"`
}

func checkGame(p string) GameCheck {
	c := GameCheck{Path: p, QuestsDir: questsDir(p)}
	exists := func(rel ...string) bool {
		_, err := os.Stat(filepath.Join(append([]string{p}, rel...)...))
		return err == nil
	}
	c.GameFound = exists("MonsterHunterWilds.exe")
	c.REFramework = exists("dinput8.dll") || exists("reframework")
	c.PEQInstalled = exists("reframework", "plugins", "PermanentEventQuest.dll")
	switch {
	case p == "":
		c.Message = "Choose your Monster Hunter Wilds folder."
	case !c.GameFound:
		c.Message = "MonsterHunterWilds.exe isn't in that folder."
	case !c.REFramework:
		c.Message = "REFramework isn't installed in this game folder."
	case !c.PEQInstalled:
		c.Message = "The Permanent Event Quest mod (PermanentEventQuest.dll) isn't installed."
	default:
		c.Message = "Ready. Quests install to " + c.QuestsDir
	}
	return c
}

var vdfPathRe = regexp.MustCompile(`"path"\s+"([^"]+)"`)

// detectGame looks in the usual Steam locations for the game.
func detectGame() string {
	var roots []string
	if runtime.GOOS == "windows" {
		roots = append(roots, steamFromRegistry()...)
		roots = append(roots, `C:\Program Files (x86)\Steam`, `C:\Program Files\Steam`)
		for c := 'A'; c <= 'Z'; c++ {
			d := string(c) + `:\`
			roots = append(roots, d+"SteamLibrary", d+"Steam", d+`Games\Steam`, d+`Games\SteamLibrary`)
		}
	}
	seen := map[string]bool{}
	var libs []string
	for _, r := range roots {
		if seen[strings.ToLower(r)] {
			continue
		}
		seen[strings.ToLower(r)] = true
		if _, err := os.Stat(r); err != nil {
			continue
		}
		libs = append(libs, r)
		if b, err := os.ReadFile(filepath.Join(r, "steamapps", "libraryfolders.vdf")); err == nil {
			for _, m := range vdfPathRe.FindAllStringSubmatch(string(b), -1) {
				libs = append(libs, strings.ReplaceAll(m[1], `\\`, `\`))
			}
		}
	}
	for _, l := range libs {
		p := filepath.Join(l, "steamapps", "common", "MonsterHunterWilds")
		if _, err := os.Stat(filepath.Join(p, "MonsterHunterWilds.exe")); err == nil {
			return p
		}
	}
	return ""
}

type QuestEntry struct {
	ID       int      `json:"id"`
	Title    string   `json:"title"`
	Stage    string   `json:"stage"`
	Star     int      `json:"star"`
	Monsters []string `json:"monsters"`
	Mine     bool     `json:"mine"`
	HasLua   bool     `json:"hasLua"`
	Modified string   `json:"modified"`
}

func listQuests(game string) ([]QuestEntry, error) {
	dir := questsDir(game)
	files, err := filepath.Glob(filepath.Join(dir, "*.raw.json"))
	if err != nil {
		return nil, err
	}
	out := []QuestEntry{}
	for _, f := range files {
		b, err := os.ReadFile(f)
		if err != nil {
			continue
		}
		base := strings.TrimSuffix(filepath.Base(f), ".raw.json")
		id, err := strconv.Atoi(base)
		if err != nil {
			continue
		}
		e := QuestEntry{ID: id, Mine: madeByApp(b)}
		if st, err := os.Stat(f); err == nil {
			e.Modified = st.ModTime().Format("2006-01-02 15:04")
		}
		if _, err := os.Stat(filepath.Join(dir, base+".lua")); err == nil {
			e.HasLua = true
		}
		if s, err := Parse(b, nil); err == nil {
			e.Title = stripTags(s.Title)
			e.Star = s.Star
			if st := GD.stage(s.Stage); st != nil {
				e.Stage = st.Name
			} else {
				e.Stage = s.Stage
			}
			for _, m := range s.Monsters {
				name := fmt.Sprintf("ID %d", m.EmID)
				if mon := GD.monster(m.EmID); mon != nil {
					name = mon.Name
				}
				switch m.Variant {
				case "tempered":
					name = "Tempered " + name
				case "arch":
					name = "Arch-Tempered " + name
				}
				e.Monsters = append(e.Monsters, name)
			}
		}
		out = append(out, e)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Mine != out[j].Mine {
			return out[i].Mine
		}
		return out[i].ID < out[j].ID
	})
	return out, nil
}

var tagRe = regexp.MustCompile(`<[^>]+>`)

func stripTags(s string) string { return tagRe.ReplaceAllString(s, "") }

func nextFreeID(game string) int {
	used := map[int]bool{}
	if l, err := listQuests(game); err == nil {
		for _, q := range l {
			used[q.ID] = true
		}
	}
	for id := 90001; ; id++ {
		if !used[id] {
			return id
		}
	}
}

func readQuest(game string, id int) (raw, ext []byte, err error) {
	dir := questsDir(game)
	raw, err = os.ReadFile(filepath.Join(dir, fmt.Sprintf("%d.raw.json", id)))
	if err != nil {
		return nil, nil, err
	}
	ext, _ = os.ReadFile(filepath.Join(dir, fmt.Sprintf("%d.ext.json", id)))
	return raw, ext, nil
}

// backup copies a quest's files to the app folder (outside the game, so the mod never loads them).
func backup(game string, id int) error {
	dir := questsDir(game)
	stamp := time.Now().Format("20060102-150405")
	dst := filepath.Join(appDir(), "backups", fmt.Sprintf("%d_%s", id, stamp))
	copied := false
	for _, suf := range []string{".raw.json", ".ext.json", ".lua"} {
		b, err := os.ReadFile(filepath.Join(dir, strconv.Itoa(id)+suf))
		if err != nil {
			continue
		}
		if err := os.MkdirAll(dst, 0o755); err != nil {
			return err
		}
		if err := os.WriteFile(filepath.Join(dst, strconv.Itoa(id)+suf), b, 0o644); err != nil {
			return err
		}
		copied = true
	}
	if !copied {
		return os.ErrNotExist
	}
	return nil
}

// installQuest writes the quest. replace=false refuses to touch an existing ID.
// Only quests made by this app can be replaced.
func installQuest(game string, s *QuestSpec, replace bool) (string, error) {
	dir := questsDir(game)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	rawPath := filepath.Join(dir, fmt.Sprintf("%d.raw.json", s.ID))
	if old, err := os.ReadFile(rawPath); err == nil {
		if !replace {
			return "", fmt.Errorf("quest ID %d is already used. Pick another ID", s.ID)
		}
		if !madeByApp(old) {
			return "", fmt.Errorf("quest %d wasn't made by this app, so it won't be overwritten. Use a different ID", s.ID)
		}
		if err := backup(game, s.ID); err != nil {
			return "", fmt.Errorf("couldn't back up the old version: %v", err)
		}
	}
	raw, ext, err := Build(s)
	if err != nil {
		return "", err
	}
	tmp := rawPath + ".tmp"
	if err := os.WriteFile(tmp, raw, 0o644); err != nil {
		return "", err
	}
	if err := os.WriteFile(filepath.Join(dir, fmt.Sprintf("%d.ext.json", s.ID)), ext, 0o644); err != nil {
		os.Remove(tmp)
		return "", err
	}
	if err := os.Rename(tmp, rawPath); err != nil {
		return "", err
	}
	return dir, nil
}

func deleteQuest(game string, id int) error {
	raw, _, err := readQuest(game, id)
	if err != nil {
		return errors.New("quest not found")
	}
	if !madeByApp(raw) {
		return errors.New("only quests made by this app can be deleted here")
	}
	if err := backup(game, id); err != nil {
		return err
	}
	dir := questsDir(game)
	for _, suf := range []string{".raw.json", ".ext.json", ".lua"} {
		os.Remove(filepath.Join(dir, strconv.Itoa(id)+suf))
	}
	return nil
}
