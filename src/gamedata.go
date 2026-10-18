package main

import (
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

//go:embed data/gamedata.json
var dataFS embed.FS

//go:embed data/builds.json
var buildsData []byte

//go:embed data/gamemap.json
var gameMap []byte

//go:embed data/monsters_dmg.json
var dmgData []byte

type Stage struct {
	Code     string `json:"code"`
	Name     string `json:"name"`
	ID       int64  `json:"id"`
	Template int    `json:"template"`
}

type Monster struct {
	ID       int64    `json:"id"`
	Name     string   `json:"name"`
	Tempered bool     `json:"tempered"`
	Arch     bool     `json:"arch"`
	Stages   []string `json:"stages"`
	Health   int      `json:"baseHealth"`
	Class    string   `json:"class"`
}

type Rank struct {
	Name    string  `json:"name"`
	GUID    string  `json:"guid"`
	Star    int     `json:"star"`
	Tier    float64 `json:"tier"`
	Label   string  `json:"label"`
	Special bool    `json:"special"`
}

type Placement struct {
	Route     string `json:"route"`
	AreaNo    int    `json:"areaNo"`
	SetAreaNo int    `json:"setAreaNo"`
	InitPos   string `json:"initPos"`
}

type SizeTable struct {
	Label string `json:"label"`
	Name  string `json:"name"`
	GUID  string `json:"guid"`
}

type Env struct {
	Label string `json:"label"`
	Name  string `json:"name"`
	ID    int64  `json:"id"`
}

type Item struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type GameData struct {
	Stages      []Stage              `json:"stages"`
	Monsters    []Monster            `json:"monsters"`
	Ranks       []Rank               `json:"ranks"`
	Placements  map[string]Placement `json:"placements"`
	Sizes       []SizeTable          `json:"sizes"`
	Envs        []Env                `json:"envs"`
	Items       []Item               `json:"items"`
	PlayerScale []float64            `json:"playerScale"`
}

var GD GameData

func loadGameData() error {
	b, err := dataFS.ReadFile("data/gamedata.json")
	if err != nil {
		return err
	}
	return json.Unmarshal(b, &GD)
}

func (g *GameData) stage(code string) *Stage {
	for i := range g.Stages {
		if g.Stages[i].Code == code {
			return &g.Stages[i]
		}
	}
	return nil
}

func (g *GameData) stageByID(id int64) *Stage {
	for i := range g.Stages {
		if g.Stages[i].ID == id {
			return &g.Stages[i]
		}
	}
	return nil
}

func (g *GameData) monster(id int64) *Monster {
	for i := range g.Monsters {
		if g.Monsters[i].ID == id {
			return &g.Monsters[i]
		}
	}
	return nil
}

func (g *GameData) rankByGUID(guid string) *Rank {
	for i := range g.Ranks {
		if g.Ranks[i].GUID == guid {
			return &g.Ranks[i]
		}
	}
	return nil
}

func (g *GameData) env(label string) *Env {
	for i := range g.Envs {
		if g.Envs[i].Label == label {
			return &g.Envs[i]
		}
	}
	return nil
}

func (g *GameData) sizeByGUID(guid string) *SizeTable {
	for i := range g.Sizes {
		if g.Sizes[i].GUID == guid {
			return &g.Sizes[i]
		}
	}
	return nil
}

// Quest templates come from the player's own Permanent Event Quest install: the mod's
// quests folder holds the official event quests, and each map uses one of them as the base
// for a custom quest. Nothing from the mod is shipped with this app.

// templateRoot is the folder searched for official quest files. Tests point it elsewhere.
var templateRoot = func() string {
	g := currentGame()
	if g == "" {
		return ""
	}
	return filepath.Join(g, "reframework", "plugins", "PermanentEventQuest")
}

var tplCache = struct {
	sync.Mutex
	m map[string]tplEntry
}{m: map[string]tplEntry{}}

type tplEntry struct {
	mod  time.Time
	data []byte
}

// findTemplate returns the path of the official quest for a map: the known quest for that
// map if it's there, otherwise any official quest (ID below 90000) set on the same map.
func findTemplate(st *Stage) (string, error) {
	root := templateRoot()
	missing := fmt.Errorf("the quest template for %s wasn't found. It comes with the Permanent Event Quest mod, in its quests folder. Reinstall the mod or pick another map", st.Name)
	if root == "" {
		return "", missing
	}
	exact := fmt.Sprintf("%d.raw.json", st.Template)
	var found, fallback string
	filepath.WalkDir(root, func(p string, d fs.DirEntry, err error) error {
		if err != nil || found != "" {
			return nil
		}
		if d.IsDir() {
			return nil
		}
		n := strings.ToLower(d.Name())
		if !strings.HasSuffix(n, ".raw.json") {
			return nil
		}
		if n == exact {
			found = p
			return filepath.SkipAll
		}
		if fallback == "" {
			if id, err := strconv.Atoi(strings.TrimSuffix(n, ".raw.json")); err == nil && id < 90000 && rawStage(p) == st.ID {
				fallback = p
			}
		}
		return nil
	})
	if found != "" {
		return found, nil
	}
	if fallback != "" {
		return fallback, nil
	}
	return "", missing
}

// rawStage reads the map ID out of a quest file.
func rawStage(p string) int64 {
	b, err := os.ReadFile(p)
	if err != nil {
		return 0
	}
	var q struct {
		DL struct {
			Stage struct {
				Value int64 `json:"_Value"`
			} `json:"_Stage"`
		} `json:"_DataList"`
	}
	if json.Unmarshal(b, &q) != nil {
		return 0
	}
	return q.DL.Stage.Value
}

// hasTemplate reports whether a map can be used right now.
func hasTemplate(code string) bool {
	st := GD.stage(code)
	if st == nil {
		return false
	}
	_, err := findTemplate(st)
	return err == nil
}

// loadTemplate returns a fresh, mutable copy of the official quest used as the
// base for a map. Numbers are kept as json.Number so they round-trip exactly.
func loadTemplate(code string) (map[string]any, error) {
	st := GD.stage(code)
	if st == nil {
		return nil, fmt.Errorf("unknown map %s", code)
	}
	p, err := findTemplate(st)
	if err != nil {
		return nil, err
	}
	fi, err := os.Stat(p)
	if err != nil {
		return nil, err
	}
	tplCache.Lock()
	e, ok := tplCache.m[p]
	tplCache.Unlock()
	if !ok || !e.mod.Equal(fi.ModTime()) {
		b, err := os.ReadFile(p)
		if err != nil {
			return nil, err
		}
		e = tplEntry{fi.ModTime(), b}
		tplCache.Lock()
		tplCache.m[p] = e
		tplCache.Unlock()
	}
	dec := json.NewDecoder(bytes.NewReader(e.data))
	dec.UseNumber()
	var m map[string]any
	if err := dec.Decode(&m); err != nil {
		return nil, fmt.Errorf("the quest template %s couldn't be read: %v", filepath.Base(p), err)
	}
	return m, nil
}
