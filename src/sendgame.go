package main

// "Send to game": turns a build into a loadout request the data reader writes into an
// empty in-game loadout slot. Every piece must exist in the player's equipment box.

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"time"
)

type SendBuild struct {
	Name     string            `json:"name"`
	WType    string            `json:"wtype"`
	Weapon   *int              `json:"weapon"`
	Armor    map[string]*int   `json:"armor"`
	Talisman *string           `json:"talisman"`
	Decos    map[string]string `json:"decos"`
	Boxes    []int             `json:"boxes"` // box index per equip slot, for builds imported from the game
}

type reqPiece struct {
	Equip int   `json:"equip"` // EQUIP_INDEX: 0 weapon, 1-5 armor, 6 talisman
	Box   int   `json:"box"`
	Cat   int   `json:"cat"`
	V0    int64 `json:"v0"`
	V1    int64 `json:"v1"`
	Gen   int   `json:"gender"`
	Acc   []int `json:"acc"`
}

type SendResult struct {
	OK       bool     `json:"ok"`
	Missing  []string `json:"missing"`
	Warnings []string `json:"warnings"`
	Backup   string   `json:"backup"`
}

type exBox struct {
	I   int     `json:"i"`
	CG  int     `json:"cg"`
	V   []int64 `json:"v"`
	Acc []int   `json:"acc"`
}

func invert[K comparable, V comparable](m map[K]V) map[V]K {
	out := make(map[V]K, len(m))
	for k, v := range m {
		out[v] = k
	}
	return out
}

func prepareSend(game string, b SendBuild) (SendResult, error) {
	res := SendResult{Missing: []string{}, Warnings: []string{}}
	raw, err := os.ReadFile(dataPath(game, "gear_export.json"))
	if err != nil {
		return res, fmt.Errorf("import your gear first (Builds → Import from game), so the app knows what you own")
	}
	var ex struct {
		Box         []exBox `json:"box"`
		Accessories []struct {
			ID int `json:"id"`
			N  int `json:"n"`
		} `json:"accessories"`
	}
	if err := json.Unmarshal(raw, &ex); err != nil {
		return res, err
	}
	armorRT := invert(GMAP.Armor)   // set index -> runtime series
	decoRT := invert(GMAP.Deco)     // deco id -> runtime accessory id
	amuletRT := invert(GMAP.Amulet) // amulet fixed -> runtime type
	parts := map[string]int{"head": 0, "chest": 1, "arms": 2, "waist": 3, "legs": 4}
	find := func(cat int, v0, v1 int64, equip int) int {
		// prefer the exact copy the imported loadout used (matters for Artian weapons)
		if equip < len(b.Boxes) && b.Boxes[equip] >= 0 {
			for _, x := range ex.Box {
				if x.I == b.Boxes[equip] && x.CG>>3 == cat && len(x.V) >= 2 && x.V[0] == v0 && x.V[1] == v1 {
					return x.I
				}
			}
		}
		for _, x := range ex.Box {
			if x.CG>>3 == cat && len(x.V) >= 2 && x.V[0] == v0 && x.V[1] == v1 {
				return x.I
			}
		}
		return -1
	}
	gender := func(i int) int {
		for _, x := range ex.Box {
			if x.I == i {
				return x.CG & 7
			}
		}
		return 0
	}
	decoAcc := func(prefix string, n int) []int {
		acc := []int{-1, -1, -1}
		for j := 0; j < n && j < 3; j++ {
			if d, ok := b.Decos[prefix+":"+strconv.Itoa(j)]; ok {
				if rt, ok := decoRT[d]; ok {
					acc[j], _ = strconv.Atoi(rt)
				}
			}
		}
		return acc
	}
	var pieces []reqPiece
	// weapon
	if b.Weapon != nil {
		ti := -1
		for i, k := range GMAP.WTypes {
			if k == b.WType {
				ti = i
			}
		}
		rt := ""
		for r, gid := range GMAP.Weapon[b.WType] {
			if gid == *b.Weapon {
				rt = r
			}
		}
		v1, _ := strconv.ParseInt(rt, 10, 64)
		name := weaponName(b.WType, *b.Weapon)
		if box := find(1, int64(ti), v1, 0); ti >= 0 && rt != "" && box >= 0 {
			pieces = append(pieces, reqPiece{Equip: 0, Box: box, Cat: 1, V0: int64(ti), V1: v1, Gen: -1, Acc: decoAcc("weapon", 3)})
		} else {
			res.Missing = append(res.Missing, name)
		}
	}
	// armor
	for kind, idx := range parts {
		pid := b.Armor[kind]
		if pid == nil {
			continue
		}
		var a *bArmor
		for i := range BDATA.Armor {
			if BDATA.Armor[i].I == *pid {
				a = &BDATA.Armor[i]
			}
		}
		if a == nil {
			continue
		}
		rt, ok := armorRT[a.Set]
		v0, _ := strconv.ParseInt(rt, 10, 64)
		if box := find(0, v0, int64(idx), idx+1); ok && box >= 0 {
			pieces = append(pieces, reqPiece{Equip: idx + 1, Box: box, Cat: 0, V0: v0, V1: int64(idx), Gen: gender(box), Acc: decoAcc(kind, 3)})
		} else {
			res.Missing = append(res.Missing, a.N)
		}
	}
	// talisman
	if b.Talisman != nil && *b.Talisman != "" {
		if *b.Talisman == "custom" {
			res.Warnings = append(res.Warnings, "Custom talismans can't be sent yet, so the talisman slot is left as it is.")
		} else {
			fixed, lvl := splitTal(*b.Talisman)
			rt, ok := amuletRT[fixed]
			v0, _ := strconv.ParseInt(rt, 10, 64)
			if box := find(2, v0, lvl, 6); ok && box >= 0 {
				pieces = append(pieces, reqPiece{Equip: 6, Box: box, Cat: 2, V0: v0, V1: lvl, Gen: -1, Acc: []int{-1, -1, -1}})
			} else {
				res.Missing = append(res.Missing, talName(*b.Talisman))
			}
		}
	}
	// decorations owned
	need := map[string]int{}
	for _, d := range b.Decos {
		need[d]++
	}
	have := map[string]int{}
	for _, a := range ex.Accessories {
		if d, ok := GMAP.Deco[strconv.Itoa(a.ID)]; ok {
			have[d] += a.N
		}
	}
	for d, n := range need {
		if have[d] < n {
			res.Warnings = append(res.Warnings, fmt.Sprintf("You own %d of %s but the build uses %d. The game will leave the extra slots empty.", have[d], decoName(d), n))
		}
	}
	if len(res.Missing) > 0 {
		return res, nil
	}
	if len(pieces) == 0 {
		return res, fmt.Errorf("the build is empty")
	}
	// back up the save before anything can change it
	bk, err := backupSave()
	if err != nil {
		res.Warnings = append(res.Warnings, "Couldn't back up your save automatically: "+err.Error())
	} else {
		res.Backup = bk
	}
	name := b.Name
	if name == "" {
		name = "MH Wilds Tools build"
	}
	if len([]rune(name)) > 24 {
		name = string([]rune(name)[:24])
	}
	reqID := time.Now().Format("20060102150405")
	out, _ := json.MarshalIndent(map[string]any{"id": reqID, "name": name, "pieces": pieces}, "", "  ")
	os.MkdirAll(filepath.Dir(dataPath(game, "x")), 0o755)
	if err := os.WriteFile(dataPath(game, "loadout_request.json"), out, 0o644); err != nil {
		return res, err
	}
	res.OK = true
	return res, nil
}

func splitTal(id string) (string, int64) {
	for i := len(id) - 1; i >= 0; i-- {
		if id[i] == ':' {
			l, _ := strconv.ParseInt(id[i+1:], 10, 64)
			return id[:i], l
		}
	}
	return id, 1
}

func weaponName(kind string, gid int) string {
	for _, w := range BDATA.Weapons[kind] {
		if w.I == gid {
			return w.N
		}
	}
	return "weapon"
}
func talName(id string) string {
	for _, t := range BDATA.Talismans {
		if t.I == id {
			return t.N
		}
	}
	return "talisman"
}
func decoName(id string) string {
	for _, d := range BDATA.Decos {
		if d.I == id {
			return d.N
		}
	}
	return "a decoration"
}

// backupSave copies the Wilds save folder(s) from Steam into the app's folder.
func backupSave() (string, error) {
	if runtime.GOOS != "windows" {
		return "", fmt.Errorf("only supported on Windows")
	}
	roots := append(steamFromRegistry(), `C:\Program Files (x86)\Steam`, `C:\Program Files\Steam`)
	var found []string
	for _, r := range roots {
		m, _ := filepath.Glob(filepath.Join(r, "userdata", "*", "2246340", "remote"))
		found = append(found, m...)
	}
	if len(found) == 0 {
		return "", fmt.Errorf("Wilds save folder not found in Steam")
	}
	dst := filepath.Join(appDir(), "save_backups", time.Now().Format("2006-01-02_15-04-05"))
	for i, src := range found {
		target := dst
		if len(found) > 1 {
			target = filepath.Join(dst, strconv.Itoa(i))
		}
		if err := copyTree(src, target); err != nil {
			return "", err
		}
	}
	return dst, nil
}

func copyTree(src, dst string) error {
	return filepath.Walk(src, func(p string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(src, p)
		t := filepath.Join(dst, rel)
		if info.IsDir() {
			return os.MkdirAll(t, 0o755)
		}
		in, err := os.Open(p)
		if err != nil {
			return err
		}
		defer in.Close()
		out, err := os.Create(t)
		if err != nil {
			return err
		}
		defer out.Close()
		_, err = io.Copy(out, in)
		return err
	})
}
