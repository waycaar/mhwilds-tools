package main

import (
	_ "embed"
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// The data reader players install: gear/loadout export, loadout writing, hunt log. Nothing else.
//
//go:embed lua/questmaker_reader.lua
var probeLua []byte

// Developer-only probe (strength table search, gear discovery). Never installed unless asked for.
//

// Multipliers confirmed by hand from a game dump (filled in once known).
//
//go:embed data/rank_rates.json
var knownRatesJSON []byte

type RankRate struct {
	HP     float64            `json:"hp"`
	Attack float64            `json:"attack,omitempty"`
	Source string             `json:"source"`
	Fields map[string]float64 `json:"fields,omitempty"`
}

type HPStatus struct {
	ProbeInstalled bool                `json:"probeInstalled"`
	DumpFound      bool                `json:"dumpFound"`
	DumpTime       string              `json:"dumpTime"`
	Matches        int                 `json:"matches"`
	Rates          map[string]RankRate `json:"rates"`
	Seen           []map[string]any    `json:"seen"`
}

func probePath(game string) string {
	return filepath.Join(game, "reframework", "autorun", "questmaker_reader.lua")
}

// the old all-in-one reader (v7 and earlier); replaced by the slimmer one above
func oldProbePath(game string) string {
	return filepath.Join(game, "reframework", "autorun", "questmaker_probe.lua")
}
func devProbePath(game string) string {
	return filepath.Join(game, "reframework", "autorun", "questmaker_devprobe.lua")
}

// removeDevProbe deletes the old developer probe (it collected the strength table,
// which is now built into the app). Safe to call any time.
func removeDevProbe(game string) {
	if game != "" {
		os.Remove(devProbePath(game))
	}
}
func dataPath(game, name string) string {
	return filepath.Join(game, "reframework", "data", "questmaker", name)
}

func installProbe(game string) error {
	os.MkdirAll(filepath.Dir(probePath(game)), 0o755)
	if err := os.WriteFile(probePath(game), probeLua, 0o644); err != nil {
		return err
	}
	removeDevProbe(game)
	os.Remove(oldProbePath(game)) // the old reader also scanned memory for health data; no longer needed
	return nil
}

var hpName = regexp.MustCompile(`(?i)(health|vital|hp|life)`)
var atkName = regexp.MustCompile(`(?i)(attack|atk|damage|power)`)
var guidRe = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

func flatten(prefix string, v any, out map[string]float64, guids map[string]bool, depth int) {
	switch t := v.(type) {
	case map[string]any:
		if depth > 3 {
			return
		}
		for k, x := range t {
			p := k
			if prefix != "" {
				p = prefix + "." + k
			}
			flatten(p, x, out, guids, depth+1)
		}
	case float64:
		out[prefix] = t
	case string:
		if guidRe.MatchString(t) {
			guids[t] = true
		}
	}
}

func _pickField(fields map[string]float64, re *regexp.Regexp) (float64, bool) {
	best, found := 0.0, false
	bestName := ""
	for k, v := range fields {
		if re.MatchString(k) && v > 0 && v < 100 {
			// prefer names that also say rate/scale/rate-like
			if !found || (strings.Contains(strings.ToLower(k), "rate") && !strings.Contains(strings.ToLower(bestName), "rate")) {
				best, found, bestName = v, true, k
			}
		}
	}
	return best, found
}

// collectRates walks any JSON tree and pulls out (strength GUID -> health/attack rate)
// from objects that hold a GUID next to a "_Health" value (directly or one level down).
func collectRates(v any, out map[string]RankRate) {
	switch t := v.(type) {
	case []any:
		for _, x := range t {
			collectRates(x, out)
		}
	case map[string]any:
		fields, guids := map[string]float64{}, map[string]bool{}
		flatten("", t, fields, guids, 0)
		hp, atk, ok := 0.0, 0.0, false
		for k, x := range fields {
			last := k[strings.LastIndex(k, ".")+1:]
			if last == "_Health" || last == "Health" {
				hp, ok = x, true
			}
			if last == "_Attack" || last == "Attack" {
				atk = x
			}
		}
		if ok && hp > 0 && hp < 200 {
			for g := range guids {
				{
					if _, exists := out[g]; !exists {
						out[g] = RankRate{HP: hp, Attack: atk, Source: "game"}
					}
				}
			}
		}
		for _, x := range t {
			collectRates(x, out)
		}
	}
}

func hpStatus(game string) HPStatus {
	st := HPStatus{Rates: map[string]RankRate{}, Seen: []map[string]any{}}
	known := map[string]RankRate{}
	json.Unmarshal(knownRatesJSON, &known)
	for g, r := range known {
		r.Source = "built-in"
		st.Rates[g] = r
	}
	if game == "" {
		return st
	}
	if _, err := os.Stat(probePath(game)); err == nil {
		st.ProbeInstalled = true
	}
	// 1) strength values seen on real monsters (exact, from the game)
	if b, err := os.ReadFile(dataPath(game, "monsters_seen.json")); err == nil {
		var s struct {
			Monsters []map[string]any `json:"monsters"`
		}
		if json.Unmarshal(b, &s) == nil {
			for _, m := range s.Monsters {
				delete(m, "context")
				st.Seen = append(st.Seen, m)
				g, _ := m["rank_guid"].(string)
				hp, _ := m["health_rate"].(float64)
				atk, _ := m["attack_rate"].(float64)
				if g != "" && hp > 0 {
					st.Rates[g] = RankRate{HP: hp, Attack: atk, Source: "seen in game"}
				}
			}
		}
	}
	// 2) the full strength table, if the reader found it
	if b, err := os.ReadFile(dataPath(game, "difficulty_dump.json")); err == nil {
		var d map[string]any
		if json.Unmarshal(b, &d) == nil {
			st.DumpFound = true
			st.DumpTime, _ = d["time"].(string)
			if h, ok := d["hits"].([]any); ok {
				st.Matches = len(h)
			}
			found := map[string]RankRate{}
			collectRates(d["tables"], found)
			collectRates(d["difficulty_objects"], found)
			for g, r := range found {
				if _, ok := st.Rates[g]; !ok {
					st.Rates[g] = r
				}
			}
		}
	}
	return st
}

type GearStatus struct {
	Found  bool            `json:"found"`
	Old    bool            `json:"old"`
	Time   string          `json:"time"`
	Path   string          `json:"path"`
	Export json.RawMessage `json:"export,omitempty"`
}

func gearStatus(game string) GearStatus {
	st := GearStatus{Path: dataPath(game, "gear_export.json")}
	if b, err := os.ReadFile(st.Path); err == nil && json.Valid(b) {
		var d struct {
			Time string `json:"time"`
		}
		json.Unmarshal(b, &d)
		st.Found, st.Time, st.Export = true, d.Time, b
		return st
	}
	if _, err := os.Stat(dataPath(game, "gear_dump.json")); err == nil {
		st.Old = true // only the first-version discovery file exists
	}
	return st
}
