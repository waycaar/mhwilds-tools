package main

import (
	"bytes"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const mainExe = "MHWildsTools.exe"
const updateExe = "MHWildsTools (update).exe"

// legacyExe is the app's name before 1.4.13. An old copy downloads the update under
// the old name; when it installs, it becomes MHWildsTools.exe and the old exe is removed.
const legacyExe = "MHWildsQuestMaker.exe"

// appPrefixes are the lowercase name starts of our own exe files, old and new.
var appPrefixes = []string{"mhwildstools", "mhwildsquestmaker"}

// selfUpdate: when this copy is the "(update)" file, copy it over the main exe,
// start the main exe and quit. Returns true if this process should exit.
func selfUpdate() bool {
	exe, err := os.Executable()
	if err != nil {
		return false
	}
	dir, base := filepath.Dir(exe), filepath.Base(exe)
	if !isUpdateName(base) {
		return false
	}
	self, err := os.ReadFile(exe)
	if err != nil {
		return false
	}
	target := filepath.Join(dir, mainExe)
	var werr error
	for i := 0; i < 40; i++ { // the old copy may still be closing (up to ~12s)
		if werr = os.WriteFile(target, self, 0o755); werr == nil {
			break
		}
		time.Sleep(300 * time.Millisecond)
	}
	if werr != nil {
		notify("MH Wilds Tools", "Couldn't install the update because MH Wilds Tools is still open.\n\nClose it, then open \""+updateExe+"\" again.")
		return true
	}
	cmd := exec.Command(target)
	cmd.Dir = dir
	cmd.Start()
	return true
}

// applyWaitingUpdate: if the main exe is started while a different "(update)" exe sits
// next to it, hand over to the update (which installs itself). Returns true to exit.
func applyWaitingUpdate() bool {
	exe, err := os.Executable()
	if err != nil || !(strings.EqualFold(filepath.Base(exe), mainExe) || strings.EqualFold(filepath.Base(exe), legacyExe)) {
		return false
	}
	up := pendingUpdate()
	if up == "" {
		return false
	}
	ust, err := os.Stat(up)
	if err != nil {
		return false
	}
	mst, err := os.Stat(exe)
	if err != nil || !ust.ModTime().After(mst.ModTime().Add(2*time.Second)) {
		return false // not newer than us: cleanup will remove it
	}
	ub, _ := os.ReadFile(up)
	self, _ := os.ReadFile(exe)
	if bytes.Equal(ub, self) {
		return false
	}
	cmd := exec.Command(up)
	cmd.Dir = filepath.Dir(exe)
	return cmd.Start() == nil
}

// cleanupOldCopies removes leftover update/old-version copies next to the main exe.
func cleanupOldCopies() {
	exe, err := os.Executable()
	if err != nil || !strings.EqualFold(filepath.Base(exe), mainExe) {
		return
	}
	dir := filepath.Dir(exe)
	go func() {
		for i := 0; i < 20; i++ {
			left := 0
			ents, _ := os.ReadDir(dir)
			for _, e := range ents {
				n := e.Name()
				ln := strings.ToLower(n)
				if e.IsDir() || !strings.HasSuffix(ln, ".exe") || strings.EqualFold(n, mainExe) {
					continue
				}
				old := strings.EqualFold(n, legacyExe) // the pre-1.4.13 exe, replaced by this one
				for _, p := range appPrefixes {
					if strings.HasPrefix(ln, p+" ") || strings.HasPrefix(ln, p+"(") || strings.HasPrefix(ln, p+"-") {
						old = true
					}
				}
				if old {
					if os.Remove(filepath.Join(dir, n)) != nil {
						left++
					}
				}
			}
			if left == 0 {
				return
			}
			time.Sleep(500 * time.Millisecond)
		}
	}()
}

// isUpdateName matches update files however the browser named them:
// "MHWildsTools (update).exe", "MHWildsTools update.exe", "MHWildsTools (update) (1).exe", ...
// and the same with the old "MHWildsQuestMaker" name.
func isUpdateName(base string) bool {
	l := strings.ToLower(base)
	if !strings.Contains(l, "update") || !strings.HasSuffix(l, ".exe") {
		return false
	}
	for _, p := range appPrefixes {
		if strings.HasPrefix(l, p) {
			return true
		}
	}
	return false
}

// pendingUpdate is the newest update file next to the running exe, if any.
func pendingUpdate() string {
	exe, err := os.Executable()
	if err != nil {
		return ""
	}
	dir := filepath.Dir(exe)
	ents, _ := os.ReadDir(dir)
	best, bestT := "", time.Time{}
	for _, e := range ents {
		if e.IsDir() || !isUpdateName(e.Name()) {
			continue
		}
		p := filepath.Join(dir, e.Name())
		if strings.EqualFold(p, exe) {
			continue
		}
		if st, err := os.Stat(p); err == nil && st.ModTime().After(bestT) {
			best, bestT = p, st.ModTime()
		}
	}
	return best
}

// versionTag is set at build time to "QMVER:<version>" so the version of any
// MH Wilds Tools .exe can be read straight from the file.
var versionTag = "QMVER:dev"

var verRe = regexp.MustCompile(`QMVER:([0-9]+\.[0-9]+\.[0-9]+)`)

func exeVersion(path string) string {
	b, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	if m := verRe.FindSubmatch(b); m != nil {
		return string(m[1])
	}
	return ""
}

// newerVersion reports whether a is a higher x.y.z version than b.
func newerVersion(a, b string) bool {
	pa, pb := strings.Split(a, "."), strings.Split(b, ".")
	for i := 0; i < 3; i++ {
		var x, y int
		if i < len(pa) {
			x, _ = strconv.Atoi(pa[i])
		}
		if i < len(pb) {
			y, _ = strconv.Atoi(pb[i])
		}
		if x != y {
			return x > y
		}
	}
	return false
}

type UpdateInfo struct {
	Version        string `json:"version"`
	BuildDate      string `json:"buildDate"`
	Pending        bool   `json:"pending"`
	PendingVersion string `json:"pendingVersion"`
	PendingNewer   bool   `json:"pendingNewer"`
	ProbeInstalled bool   `json:"probeInstalled"`
	ProbeCurrent   bool   `json:"probeCurrent"`
	Folder         string `json:"folder"`
}

func updateInfo(game string) UpdateInfo {
	u := UpdateInfo{Version: appVersion, BuildDate: buildDate}
	if exe, err := os.Executable(); err == nil {
		u.Folder = filepath.Dir(exe)
	}
	if p := pendingUpdate(); p != "" {
		u.Pending = true
		u.PendingVersion = exeVersion(p)
		u.PendingNewer = u.PendingVersion == "" || newerVersion(u.PendingVersion, appVersion)
	}
	if game != "" {
		if b, err := os.ReadFile(probePath(game)); err == nil {
			u.ProbeInstalled = true
			u.ProbeCurrent = bytes.Equal(b, probeLua)
		}
		if _, err := os.Stat(oldProbePath(game)); err == nil {
			u.ProbeInstalled = true
			u.ProbeCurrent = false // old all-in-one reader: replace it
		}
	}
	return u
}
