package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Monster icons come from the Monster Hunter Wiki's "MHWilds Monster Icons" category
// (files named "MHWA-<Monster> Icon.webp"). They're downloaded on the user's PC into
// the icons folder; nothing is bundled in the app.
var wikiBase = func() string {
	if v := os.Getenv("QM_WIKI_BASE"); v != "" { // for testing
		return v
	}
	return "https://monsterhunterwiki.org"
}()

func userAgentStr() string {
	return "MHWildsTools/" + appVersion + " (github.com/waycaar/mhwilds-tools)"
}

type IconResult struct {
	Downloaded []string `json:"downloaded"`
	Skipped    []string `json:"skipped"`
	Missing    []string `json:"missing"`
	Failed     []string `json:"failed"`
}

func httpGet(c *http.Client, u string) (*http.Response, error) {
	req, _ := http.NewRequest("GET", u, nil)
	req.Header.Set("User-Agent", userAgentStr())
	return c.Do(req)
}

func downloadWikiIcons(overwrite bool) (IconResult, error) {
	res := IconResult{Downloaded: []string{}, Skipped: []string{}, Missing: []string{}, Failed: []string{}}
	dir := iconsDir()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return res, err
	}
	have := listIcons()
	c := &http.Client{Timeout: 30 * time.Second}

	titleFor := map[string]string{} // wiki title -> monster name
	var titles []string
	for _, m := range GD.Monsters {
		if _, ok := have[normName(m.Name)]; ok && !overwrite {
			res.Skipped = append(res.Skipped, m.Name)
			continue
		}
		t := "File:MHWA-" + m.Name + " Icon.webp"
		titleFor[t] = m.Name
		titles = append(titles, t)
	}
	urls := map[string]string{} // monster -> image url
	for i := 0; i < len(titles); i += 40 {
		j := i + 40
		if j > len(titles) {
			j = len(titles)
		}
		q := url.Values{"action": {"query"}, "format": {"json"}, "prop": {"imageinfo"}, "iiprop": {"url"},
			"titles": {strings.Join(titles[i:j], "|")}}
		resp, err := httpGet(c, wikiBase+"/api.php?"+q.Encode())
		if err != nil {
			return res, fmt.Errorf("couldn't reach the Monster Hunter Wiki: %v", err)
		}
		var body struct {
			Query struct {
				Normalized []struct{ From, To string } `json:"normalized"`
				Pages      map[string]struct {
					Title     string `json:"title"`
					ImageInfo []struct {
						URL string `json:"url"`
					} `json:"imageinfo"`
				} `json:"pages"`
			} `json:"query"`
		}
		err = json.NewDecoder(resp.Body).Decode(&body)
		resp.Body.Close()
		if err != nil {
			return res, fmt.Errorf("unexpected reply from the wiki: %v", err)
		}
		norm := map[string]string{}
		for _, n := range body.Query.Normalized {
			norm[n.To] = n.From
		}
		for _, p := range body.Query.Pages {
			t := p.Title
			if f, ok := norm[t]; ok {
				t = f
			}
			name, ok := titleFor[t]
			if !ok {
				continue
			}
			if len(p.ImageInfo) > 0 && p.ImageInfo[0].URL != "" {
				urls[name] = p.ImageInfo[0].URL
			}
		}
	}
	for _, t := range titles {
		name := titleFor[t]
		u, ok := urls[name]
		if !ok {
			res.Missing = append(res.Missing, name)
			continue
		}
		resp, err := httpGet(c, u)
		if err != nil {
			res.Failed = append(res.Failed, name)
			continue
		}
		b, err := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
		resp.Body.Close()
		ext := map[string]string{"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif"}[http.DetectContentType(b)]
		if err != nil || resp.StatusCode != 200 || ext == "" {
			res.Failed = append(res.Failed, name)
			continue
		}
		for _, old := range listIcons() {
			if normName(strings.TrimSuffix(old, filepath.Ext(old))) == normName(name) {
				os.Remove(filepath.Join(dir, old))
			}
		}
		if err := os.WriteFile(filepath.Join(dir, name+ext), b, 0o644); err != nil {
			res.Failed = append(res.Failed, name)
			continue
		}
		res.Downloaded = append(res.Downloaded, name)
	}
	return res, nil
}
