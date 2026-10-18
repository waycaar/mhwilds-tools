package main

// Online updates from GitHub Releases. The app downloads the new .exe itself, so
// Windows never marks it as "downloaded from the internet" and SmartScreen stays quiet.

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const ghRepo = "waycaar/mhwilds-tools"

type ghAsset struct {
	Name string `json:"name"`
	URL  string `json:"browser_download_url"`
	Size int64  `json:"size"`
}

type OnlineInfo struct {
	OK      bool   `json:"ok"`
	Version string `json:"version"`
	Newer   bool   `json:"newer"`
	Notes   string `json:"notes"`
	Page    string `json:"page"`
	Error   string `json:"error,omitempty"`
	asset   ghAsset
	sha     string
}

var (
	onlineMu    sync.Mutex
	onlineCache OnlineInfo
	onlineAt    time.Time
)

var ghClient = &http.Client{Timeout: 20 * time.Second}

func onlineLatest(force bool) OnlineInfo {
	onlineMu.Lock()
	defer onlineMu.Unlock()
	if !force && time.Since(onlineAt) < 10*time.Minute && onlineCache.OK {
		return onlineCache
	}
	info := OnlineInfo{}
	req, _ := http.NewRequest("GET", ghRaw()+"/latest.json?t="+fmt.Sprint(time.Now().Unix()), nil)
	req.Header.Set("User-Agent", userAgentStr())
	req.Header.Set("Cache-Control", "no-cache")
	resp, err := ghClient.Do(req)
	if err != nil {
		info.Error = "couldn't reach GitHub (are you online?)"
		return info
	}
	defer resp.Body.Close()
	if resp.StatusCode == 404 {
		info.Error = "no public release yet"
		return info
	}
	if resp.StatusCode != 200 {
		info.Error = fmt.Sprintf("GitHub answered %d", resp.StatusCode)
		return info
	}
	var rel struct {
		Version         string `json:"version"`
		Notes           string `json:"notes"`
		File            string `json:"file"`
		Size            int64  `json:"size"`
		SHA256          string `json:"sha256"`
		Tag, Body, Page string
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&rel); err != nil || rel.File == "" {
		info.Error = "unexpected answer from GitHub"
		return info
	}
	info.asset = ghAsset{Name: rel.File, URL: ghRaw() + "/" + rel.File, Size: rel.Size}
	info.sha = strings.ToLower(rel.SHA256)
	rel.Tag, rel.Body, rel.Page = rel.Version, rel.Notes, "https://github.com/"+ghRepo
	info.OK = true
	info.Version = normVer(rel.Tag)
	info.Notes = rel.Body
	info.Page = rel.Page
	info.Newer = appVersion == "dev" || newerVersion(info.Version, appVersion)
	onlineCache, onlineAt = info, time.Now()
	return info
}

// normVer turns "v1.3" into "1.3.0".
func normVer(t string) string {
	t = strings.TrimPrefix(strings.TrimPrefix(t, "v"), "V")
	for strings.Count(t, ".") < 2 {
		t += ".0"
	}
	return t
}

// downloadOnlineUpdate saves the release next to the app as the update file;
// the normal restart then installs it.
func downloadOnlineUpdate() (string, error) {
	info := onlineLatest(true)
	if !info.OK {
		return "", fmt.Errorf("%s", info.Error)
	}
	if !info.Newer {
		return "", fmt.Errorf("you already have v%s or newer", info.Version)
	}
	exe, err := os.Executable()
	if err != nil {
		return "", err
	}
	dir := filepath.Dir(exe)
	tmp := filepath.Join(dir, "MHWildsTools (update).download")
	dst := filepath.Join(dir, updateExe)
	req, _ := http.NewRequest("GET", info.asset.URL, nil)
	req.Header.Set("User-Agent", userAgentStr())
	cl := &http.Client{Timeout: 5 * time.Minute}
	resp, err := cl.Do(req)
	if err != nil {
		return "", fmt.Errorf("download failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("download failed (%d)", resp.StatusCode)
	}
	f, err := os.Create(tmp)
	if err != nil {
		return "", err
	}
	n, err := io.Copy(f, io.LimitReader(resp.Body, 200<<20))
	f.Close()
	if err != nil || (info.asset.Size > 0 && n != info.asset.Size) {
		os.Remove(tmp)
		return "", fmt.Errorf("download was incomplete, try again")
	}
	if info.sha != "" {
		if got := fileSHA(tmp); got != info.sha {
			os.Remove(tmp)
			return "", fmt.Errorf("downloaded file didn't match its checksum, try again")
		}
	}
	// make sure it really is the version the release says it is
	if v := exeVersion(tmp); v != info.Version {
		os.Remove(tmp)
		return "", fmt.Errorf("downloaded file isn't v%s (found %q)", info.Version, v)
	}
	os.Remove(dst)
	if err := os.Rename(tmp, dst); err != nil {
		return "", err
	}
	return info.Version, nil
}

// ghRaw is where latest.json and the app file live; QM_GHAPI points it at a test server.
func ghRaw() string {
	if v := os.Getenv("QM_GHAPI"); v != "" {
		return v
	}
	return "https://raw.githubusercontent.com/" + ghRepo + "/main"
}

func fileSHA(p string) string {
	f, err := os.Open(p)
	if err != nil {
		return ""
	}
	defer f.Close()
	h := sha256.New()
	io.Copy(h, f)
	return hex.EncodeToString(h.Sum(nil))
}
