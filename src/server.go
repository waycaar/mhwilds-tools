package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	neturl "net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"
)

//go:embed web/*
var webFS embed.FS

var cfgMu sync.Mutex

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	enc.Encode(v)
}

func fail(w http.ResponseWriter, err error) {
	writeJSON(w, 400, map[string]any{"error": err.Error()})
}

func currentGame() string {
	cfgMu.Lock()
	defer cfgMu.Unlock()
	return loadConfig().GamePath
}

func newServer(token string) http.Handler {
	mux := http.NewServeMux()
	guard := func(h http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			if r.Header.Get("X-Token") != token {
				http.Error(w, "forbidden", 403)
				return
			}
			h(w, r)
		}
	}
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		b, _ := webFS.ReadFile("web/index.html")
		html := strings.Replace(string(b), "__TOKEN__", token, 1)
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		w.Write([]byte(html))
	})
	for _, js := range []string{"builds.js", "theme.js", "updates.js", "gearicons.js", "damage.js", "hunts.js", "hunted.js", "monsters.js", "artian.js", "settings.js"} {
		name := js
		mux.HandleFunc("/"+name, func(w http.ResponseWriter, r *http.Request) {
			b, _ := webFS.ReadFile("web/" + name)
			w.Header().Set("Content-Type", "text/javascript; charset=utf-8")
			w.Header().Set("Cache-Control", "no-store")
			w.Write(b)
		})
	}
	mux.HandleFunc("/inter.woff2", func(w http.ResponseWriter, r *http.Request) {
		b, _ := webFS.ReadFile("web/inter.woff2")
		w.Header().Set("Content-Type", "font/woff2")
		w.Header().Set("Cache-Control", "max-age=86400")
		w.Write(b)
	})
	mux.HandleFunc("/api/dmgdata", guard(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Write(dmgData)
	}))
	mux.HandleFunc("/api/hunts", guard(func(w http.ResponseWriter, r *http.Request) {
		game := currentGame()
		out := map[string]any{"hunts": []any{}, "reader": false, "questDetect": false}
		if game == "" {
			writeJSON(w, 200, out)
			return
		}
		if _, err := os.Stat(probePath(game)); err == nil {
			out["reader"] = true
		}
		if b, err := os.ReadFile(dataPath(game, "hunts.json")); err == nil {
			var h struct {
				Hunts []any `json:"hunts"`
			}
			if json.Unmarshal(b, &h) == nil && h.Hunts != nil {
				out["hunts"] = h.Hunts
			}
		}
		if b, err := os.ReadFile(dataPath(game, "hunt_debug.json")); err == nil {
			var d map[string]any
			if json.Unmarshal(b, &d) == nil && d["found"] != nil {
				out["questDetect"] = true
			}
		}
		writeJSON(w, 200, out)
	}))
	mux.HandleFunc("/api/builds/map", guard(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Write(gameMap)
	}))
	mux.HandleFunc("/api/builds/data", guard(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Write(buildsData)
	}))
	mux.HandleFunc("/api/hunted", guard(func(w http.ResponseWriter, r *http.Request) {
		p := filepath.Join(appDir(), "hunted.json")
		if r.Method == "PUT" {
			b, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
			if err != nil || !json.Valid(b) {
				fail(w, fmt.Errorf("invalid hunted data"))
				return
			}
			if err := os.WriteFile(p, b, 0o644); err != nil {
				fail(w, err)
				return
			}
			writeJSON(w, 200, map[string]any{"ok": true})
			return
		}
		b, err := os.ReadFile(p)
		if err != nil || !json.Valid(b) {
			writeJSON(w, 200, map[string]any{"levels": map[string]int{}, "only": false})
			return
		}
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Write(b)
	}))
	mux.HandleFunc("/api/builds", guard(func(w http.ResponseWriter, r *http.Request) {
		p := filepath.Join(appDir(), "builds.json")
		if r.Method == "PUT" {
			b, err := io.ReadAll(io.LimitReader(r.Body, 16<<20))
			if err != nil || !json.Valid(b) {
				fail(w, fmt.Errorf("invalid builds data"))
				return
			}
			if old, err := os.ReadFile(p); err == nil {
				os.WriteFile(p+".bak", old, 0o644)
			}
			if err := os.WriteFile(p, b, 0o644); err != nil {
				fail(w, err)
				return
			}
			writeJSON(w, 200, map[string]any{"ok": true})
			return
		}
		b, err := os.ReadFile(p)
		if err != nil || !json.Valid(b) {
			writeJSON(w, 200, map[string]any{"builds": []any{}})
			return
		}
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Write(b)
	}))
	mux.HandleFunc("/api/gear", guard(func(w http.ResponseWriter, r *http.Request) {
		g := currentGame()
		if r.Method == "POST" { // open the folder holding the export
			d := filepath.Dir(dataPath(g, "gear_dump.json"))
			os.MkdirAll(d, 0o755)
			if runtime.GOOS == "windows" {
				exec.Command("explorer", d).Start()
			}
		}
		writeJSON(w, 200, gearStatus(g))
	}))
	mux.HandleFunc("/api/owned", guard(func(w http.ResponseWriter, r *http.Request) {
		// what the last gear export says you own, as builder ids, for the editor's "only gear I own"
		g := currentGame()
		out := map[string]any{"found": false}
		var armor []int
		weapons := map[string][]int{}
		var tal []string
		decos := map[string]int{}
		for _, wt := range GMAP.WTypes {
			o := loadOwned(g, wt)
			if o == nil {
				writeJSON(w, 200, out)
				return
			}
			for id := range o.Weapons {
				weapons[wt] = append(weapons[wt], id)
			}
			if armor == nil {
				armor = []int{}
				for id := range o.Armor {
					armor = append(armor, id)
				}
				tal = []string{}
				for k := range o.Tal {
					tal = append(tal, k)
				}
				decos = o.Decos
			}
		}
		out = map[string]any{"found": true, "armor": armor, "weapons": weapons, "tal": tal, "decos": decos, "time": gearStatus(g)}
		writeJSON(w, 200, out)
	}))
	mux.HandleFunc("/api/update", guard(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, updateInfo(currentGame()))
	}))
	mux.HandleFunc("/api/update/online", guard(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, onlineLatest(r.URL.Query().Get("force") == "1"))
	}))
	mux.HandleFunc("/api/update/download", guard(func(w http.ResponseWriter, r *http.Request) {
		v, err := downloadOnlineUpdate()
		if err != nil {
			fail(w, err)
			return
		}
		writeJSON(w, 200, map[string]string{"version": v})
	}))
	mux.HandleFunc("/api/calc", guard(func(w http.ResponseWriter, r *http.Request) {
		var req CalcReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			fail(w, err)
			return
		}
		writeJSON(w, 200, Solve(req, currentGame()))
	}))
	mux.HandleFunc("/api/gear/send", guard(func(w http.ResponseWriter, r *http.Request) {
		var b SendBuild
		if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
			fail(w, err)
			return
		}
		res, err := prepareSend(currentGame(), b)
		if err != nil {
			fail(w, err)
			return
		}
		writeJSON(w, 200, res)
	}))
	mux.HandleFunc("/api/settings", guard(func(w http.ResponseWriter, r *http.Request) {
		cfgMu.Lock()
		defer cfgMu.Unlock()
		c := loadConfig()
		if r.Method == "POST" {
			var body struct {
				Theme *Theme          `json:"theme"`
				Prefs json.RawMessage `json:"prefs"`
			}
			if json.NewDecoder(r.Body).Decode(&body) == nil {
				if body.Theme != nil {
					c.Theme = body.Theme
				}
				if len(body.Prefs) > 0 && json.Valid(body.Prefs) {
					c.Prefs = body.Prefs
				}
				saveConfig(c)
			}
		}
		writeJSON(w, 200, map[string]any{"theme": c.Theme, "prefs": c.Prefs})
	}))
	mux.HandleFunc("/api/meta", guard(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]any{"data": GD, "version": appVersion, "buildDate": buildDate, "tag": versionTag})
	}))
	mux.HandleFunc("/api/game", guard(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			var body struct {
				Path string `json:"path"`
			}
			json.NewDecoder(r.Body).Decode(&body)
			p := strings.Trim(strings.TrimSpace(body.Path), `"`)
			c := checkGame(p)
			if c.GameFound {
				cfgMu.Lock()
				c := loadConfig()
				c.GamePath = p
				saveConfig(c)
				cfgMu.Unlock()
			}
			writeJSON(w, 200, c)
			return
		}
		p := currentGame()
		if p == "" || !checkGame(p).GameFound {
			if d := detectGame(); d != "" {
				p = d
				cfgMu.Lock()
				c := loadConfig()
				c.GamePath = p
				saveConfig(c)
				cfgMu.Unlock()
			}
		}
		writeJSON(w, 200, checkGame(p))
	}))
	mux.HandleFunc("/api/quests", guard(func(w http.ResponseWriter, r *http.Request) {
		g := currentGame()
		l, err := listQuests(g)
		if err != nil {
			fail(w, err)
			return
		}
		writeJSON(w, 200, map[string]any{"quests": l, "nextId": nextFreeID(g)})
	}))
	mux.HandleFunc("/api/quest", guard(func(w http.ResponseWriter, r *http.Request) {
		g := currentGame()
		id, _ := strconv.Atoi(r.URL.Query().Get("id"))
		switch r.Method {
		case "GET":
			raw, ext, err := readQuest(g, id)
			if err != nil {
				fail(w, fmt.Errorf("couldn't read quest %d", id))
				return
			}
			s, err := Parse(raw, ext)
			if err != nil {
				fail(w, fmt.Errorf("quest %d couldn't be read: %v", id, err))
				return
			}
			writeJSON(w, 200, map[string]any{"spec": s, "mine": madeByApp(raw)})
		case "DELETE":
			if err := deleteQuest(g, id); err != nil {
				fail(w, err)
				return
			}
			writeJSON(w, 200, map[string]any{"ok": true})
		}
	}))
	mux.HandleFunc("/api/validate", guard(func(w http.ResponseWriter, r *http.Request) {
		var s QuestSpec
		if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
			fail(w, err)
			return
		}
		is := Validate(&s)
		if is == nil {
			is = []Issue{}
		}
		writeJSON(w, 200, map[string]any{"issues": is})
	}))
	mux.HandleFunc("/api/preview", guard(func(w http.ResponseWriter, r *http.Request) {
		var s QuestSpec
		if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
			fail(w, err)
			return
		}
		raw, ext, err := Build(&s)
		if err != nil {
			fail(w, err)
			return
		}
		writeJSON(w, 200, map[string]any{"raw": string(raw), "ext": string(ext)})
	}))
	mux.HandleFunc("/api/install", guard(func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Spec    QuestSpec `json:"spec"`
			Replace bool      `json:"replace"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			fail(w, err)
			return
		}
		g := currentGame()
		if c := checkGame(g); !c.GameFound {
			fail(w, fmt.Errorf("set your game folder first"))
			return
		}
		dir, err := installQuest(g, &body.Spec, body.Replace)
		if err != nil {
			fail(w, err)
			return
		}
		writeJSON(w, 200, map[string]any{"ok": true, "dir": dir})
	}))
	mux.HandleFunc("/api/hp", guard(func(w http.ResponseWriter, r *http.Request) {
		g := currentGame()
		if r.Method == "POST" {
			if c := checkGame(g); !c.GameFound {
				fail(w, fmt.Errorf("set your game folder first"))
				return
			}
			if err := installProbe(g); err != nil {
				fail(w, err)
				return
			}
		}
		writeJSON(w, 200, hpStatus(g))
	}))
	mux.HandleFunc("/icons/", func(w http.ResponseWriter, r *http.Request) {
		name := filepath.Base(r.URL.Path)
		p := filepath.Join(iconsDir(), name)
		if _, err := os.Stat(p); err != nil {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		http.ServeFile(w, r, p)
	})
	mux.HandleFunc("/api/icons", guard(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]any{"dir": iconsDir(), "icons": listIcons()})
	}))
	mux.HandleFunc("/api/icon", guard(func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimSpace(r.URL.Query().Get("name"))
		if name == "" || normName(name) == "" {
			fail(w, fmt.Errorf("no monster name"))
			return
		}
		b, err := io.ReadAll(io.LimitReader(r.Body, 8<<20))
		if err != nil || len(b) == 0 {
			fail(w, fmt.Errorf("empty image"))
			return
		}
		ext := map[string]string{"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif"}[http.DetectContentType(b)]
		if ext == "" {
			fail(w, fmt.Errorf("only PNG, JPG, WEBP or GIF images work"))
			return
		}
		dir := iconsDir()
		if err := os.MkdirAll(dir, 0o755); err != nil {
			fail(w, err)
			return
		}
		for _, old := range listIcons() {
			if normName(strings.TrimSuffix(old, filepath.Ext(old))) == normName(name) {
				os.Remove(filepath.Join(dir, old))
			}
		}
		safe := strings.Map(func(r rune) rune {
			if strings.ContainsRune(`<>:"/\|?*`, r) {
				return -1
			}
			return r
		}, name)
		if err := os.WriteFile(filepath.Join(dir, safe+ext), b, 0o644); err != nil {
			fail(w, err)
			return
		}
		writeJSON(w, 200, map[string]any{"ok": true})
	}))
	mux.HandleFunc("/api/icons/download", guard(func(w http.ResponseWriter, r *http.Request) {
		res, err := downloadWikiIcons(r.URL.Query().Get("overwrite") == "1")
		if err != nil {
			fail(w, err)
			return
		}
		writeJSON(w, 200, res)
	}))
	mux.HandleFunc("/api/openicons", guard(func(w http.ResponseWriter, r *http.Request) {
		d := iconsDir()
		os.MkdirAll(d, 0o755)
		if runtime.GOOS == "windows" {
			exec.Command("explorer", d).Start()
		}
		writeJSON(w, 200, map[string]any{"ok": true, "dir": d})
	}))
	mux.HandleFunc("/api/restore", guard(func(w http.ResponseWriter, r *http.Request) {
		p := filepath.Join(appDir(), "restore.json")
		b, err := os.ReadFile(p)
		os.Remove(p)
		if err != nil || !json.Valid(b) {
			writeJSON(w, 200, map[string]any{"state": nil})
			return
		}
		writeJSON(w, 200, map[string]any{"state": json.RawMessage(b)})
	}))
	mux.HandleFunc("/api/restart", guard(func(w http.ResponseWriter, r *http.Request) {
		if b, err := io.ReadAll(io.LimitReader(r.Body, 4<<20)); err == nil && json.Valid(b) {
			os.WriteFile(filepath.Join(appDir(), "restore.json"), b, 0o644)
		}
		exe, err := os.Executable()
		if err != nil {
			fail(w, err)
			return
		}
		if up := pendingUpdate(); up != "" { // restarting also installs a waiting update
			exe = up
		}
		cmd := exec.Command(exe, os.Args[1:]...)
		cmd.Dir = filepath.Dir(exe)
		if err := cmd.Start(); err != nil {
			fail(w, fmt.Errorf("couldn't start a new copy: %v", err))
			return
		}
		writeJSON(w, 200, map[string]any{"ok": true})
		if f, ok := w.(http.Flusher); ok {
			f.Flush()
		}
		go func() {
			time.Sleep(300 * time.Millisecond)
			os.Exit(0)
		}()
	}))
	mux.HandleFunc("/api/openfolder", guard(func(w http.ResponseWriter, r *http.Request) {
		d := questsDir(currentGame())
		os.MkdirAll(d, 0o755)
		if runtime.GOOS == "windows" {
			exec.Command("explorer", d).Start()
		}
		writeJSON(w, 200, map[string]any{"ok": true})
	}))
	mux.HandleFunc("/api/openurl", guard(func(w http.ResponseWriter, r *http.Request) {
		// opens a credits link in the default browser; only a few known sites
		u, err := neturl.Parse(r.URL.Query().Get("u"))
		ok := err == nil && u.Scheme == "https"
		if ok {
			switch strings.TrimPrefix(u.Hostname(), "www.") {
			case "github.com", "nexusmods.com", "discord.com", "rsms.me":
			default:
				ok = false
			}
		}
		if !ok {
			fail(w, fmt.Errorf("that link can't be opened from here"))
			return
		}
		if runtime.GOOS == "windows" {
			exec.Command("rundll32", "url.dll,FileProtocolHandler", u.String()).Start()
		}
		writeJSON(w, 200, map[string]any{"ok": true})
	}))
	return mux
}

func listen() (net.Listener, string, error) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, "", err
	}
	return l, "http://" + l.Addr().String() + "/", nil
}
