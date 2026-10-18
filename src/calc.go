package main

// Priority build calculator.
// The user lists skills in priority order with a wanted level. Builds are compared
// lexicographically: the first skill's achieved level matters most, then the second, etc.
// Search = depth-first over (weapon, 5 armor pieces, talisman) with dominance pruning per
// slot and an optimistic bound, then decorations are fitted greedily in priority order.

import (
	"encoding/json"
	"os"
	"sort"
	"strconv"
	"time"
)

type bArmor struct {
	I   int                     `json:"i"`
	Set int                     `json:"set"`
	K   string                  `json:"k"`
	N   string                  `json:"n"`
	Rar int                     `json:"rar"`
	Def struct{ Base, Max int } `json:"def"`
	Sl  []int                   `json:"sl"`
	Sk  map[string]int          `json:"sk"`
}
type bDeco struct {
	I  string         `json:"i"`
	N  string         `json:"n"`
	Lv int            `json:"lv"`
	On string         `json:"on"`
	Sk map[string]int `json:"sk"`
}
type bTal struct {
	I   string         `json:"i"`
	N   string         `json:"n"`
	Rar int            `json:"rar"`
	Sk  map[string]int `json:"sk"`
}
type bWeapon struct {
	I   int            `json:"i"`
	N   string         `json:"n"`
	Rar int            `json:"rar"`
	Def int            `json:"def"`
	Sl  []int          `json:"sl"`
	Sk  map[string]int `json:"sk"`
}
type bRank struct {
	L int `json:"l"`
	P int `json:"p"`
}
type bSkill struct {
	N   string  `json:"n"`
	K   string  `json:"k"`
	Max int     `json:"max"`
	R   []bRank `json:"r"`
}
type bData struct {
	Skills    map[string]bSkill    `json:"skills"`
	Armor     []bArmor             `json:"armor"`
	Decos     []bDeco              `json:"decos"`
	Talismans []bTal               `json:"talismans"`
	Weapons   map[string][]bWeapon `json:"weapons"`
}
type gMap struct {
	WTypes []string                  `json:"wtypes"`
	Armor  map[string]int            `json:"armor"`
	Deco   map[string]string         `json:"deco"`
	Amulet map[string]string         `json:"amulet"`
	Weapon map[string]map[string]int `json:"weapon"`
}

var BDATA *bData
var GMAP *gMap

func loadBuildEngine() error {
	BDATA = &bData{}
	if err := json.Unmarshal(buildsData, BDATA); err != nil {
		return err
	}
	GMAP = &gMap{}
	return json.Unmarshal(gameMap, GMAP)
}

// ---------- owned gear (from the game export) ----------

type owned struct {
	Armor   map[int]bool
	Weapons map[int]bool // weapon game ids for the chosen type
	Tal     map[string]bool
	Decos   map[string]int
}

func loadOwned(game, wtype string) *owned {
	b, err := os.ReadFile(dataPath(game, "gear_export.json"))
	if err != nil {
		return nil
	}
	var ex struct {
		Box []struct {
			CG int     `json:"cg"`
			V  []int64 `json:"v"`
		} `json:"box"`
		Accessories []struct {
			ID int `json:"id"`
			N  int `json:"n"`
		} `json:"accessories"`
	}
	if json.Unmarshal(b, &ex) != nil {
		return nil
	}
	o := &owned{Armor: map[int]bool{}, Weapons: map[int]bool{}, Tal: map[string]bool{}, Decos: map[string]int{}}
	parts := []string{"head", "chest", "arms", "waist", "legs"}
	for _, x := range ex.Box {
		if len(x.V) < 2 {
			continue
		}
		switch x.CG >> 3 {
		case 0:
			si, ok := GMAP.Armor[strconv.FormatInt(x.V[0], 10)]
			if !ok || x.V[1] < 0 || int(x.V[1]) >= len(parts) {
				continue
			}
			for _, a := range BDATA.Armor {
				if a.Set == si && a.K == parts[x.V[1]] {
					o.Armor[a.I] = true
				}
			}
		case 1:
			if int(x.V[0]) < len(GMAP.WTypes) && GMAP.WTypes[x.V[0]] == wtype {
				if gid, ok := GMAP.Weapon[wtype][strconv.FormatInt(x.V[1], 10)]; ok {
					o.Weapons[gid] = true
				}
			}
		case 2:
			if t, ok := GMAP.Amulet[strconv.FormatInt(x.V[0], 10)]; ok {
				o.Tal[t+":"+strconv.FormatInt(x.V[1], 10)] = true
			}
		}
	}
	for _, a := range ex.Accessories {
		if d, ok := GMAP.Deco[strconv.Itoa(a.ID)]; ok {
			o.Decos[d] += a.N
		}
	}
	return o
}

// ---------- request / response ----------

type CalcTarget struct {
	Skill string `json:"skill"`
	Want  int    `json:"want"`
	Must  bool   `json:"must"`
}
type CalcReq struct {
	WType     string         `json:"wtype"`
	Weapon    *int           `json:"weapon"`
	Targets   []CalcTarget   `json:"targets"`
	Owned     bool           `json:"owned"`
	Talisman  string         `json:"talisman"` // any | none | <id>
	Locks     map[string]int `json:"locks"`    // armor kind -> piece id
	Exclude   []int          `json:"exclude"`
	MinRarity int            `json:"minRarity"`
	ExclWeap  []int          `json:"excludeWeapons"` // gear you can't craft yet (hunted monsters)
	ExclTal   []string       `json:"excludeTal"`
	VirtSlots []int          `json:"virtualSlots"` // a weapon not in the data (Artian): only its slots matter
	Seconds   int            `json:"seconds"`      // how long to search (2-60, default 6)
}
type CalcBuild struct {
	Weapon   *int              `json:"weapon"`
	Armor    map[string]*int   `json:"armor"`
	Talisman *string           `json:"talisman"`
	Decos    map[string]string `json:"decos"`
	Achieved []int             `json:"achieved"`
	Skills   map[string]int    `json:"skills"`
	Defense  int               `json:"defense"`
	FreeSlot int               `json:"freeSlots"`
	free     []freeSlot
}

type Suggestion struct {
	Skill  string `json:"skill"`
	Levels int    `json:"levels"`
	Total  int    `json:"total"`
}
type CalcResp struct {
	Results  []CalcBuild  `json:"results"`
	Complete bool         `json:"complete"`
	Checked  int          `json:"checked"`
	Millis   int64        `json:"ms"`
	OwnedOK  bool         `json:"ownedAvailable"`
	Bottle   string       `json:"bottleneck,omitempty"`
	Room     []Suggestion `json:"room"`
}

// ---------- solver ----------

type cand struct {
	key    string // "weapon" | armor kind | "tal"
	id     int
	sid    string
	vec    []int // direct contribution per target (levels, or piece counts for set/group targets)
	pot    []int // vec + best possible decoration levels from its slots
	slots  []int
	isWpn  bool
	def    int
	skills map[string]int
}

type solver struct {
	req       CalcReq
	tk        []string // target skill ids
	want      []int
	must      []bool
	weight    []int
	isSet     []bool
	ranks     [][]bRank
	slots     [][]cand
	suffix    [][]int
	armorDeco []bDeco
	wpnDeco   []bDeco
	decoLeft  map[string]int // nil = unlimited
	results   []CalcBuild
	limit     int
	checked   int
	deadline  time.Time
	timedOut  bool
	pick      []*cand
	bufNP     [][]int
	bufOpt    [][]int
}

func setLevel(ranks []bRank, pieces int) int {
	lv := 0
	for _, r := range ranks {
		if r.P > 0 && pieces >= r.P && r.L > lv {
			lv = r.L
		}
	}
	return lv
}

func slotScore(sl []int) int {
	s := 0
	for _, x := range sl {
		s += x * x
	}
	return s
}

// a dominates b: at least as good for every target and its slots are at least as good.
func dominates(a, b *cand) bool {
	for i := range a.vec {
		if a.vec[i] < b.vec[i] {
			return false
		}
	}
	as := append([]int(nil), a.slots...)
	bs := append([]int(nil), b.slots...)
	sort.Sort(sort.Reverse(sort.IntSlice(as)))
	sort.Sort(sort.Reverse(sort.IntSlice(bs)))
	for i := range bs {
		if bs[i] == 0 {
			continue
		}
		if i >= len(as) || as[i] < bs[i] {
			return false
		}
	}
	return true
}

func (s *solver) prune(cs []cand) []cand {
	sort.SliceStable(cs, func(i, j int) bool {
		si, sj := 0, 0
		for t, v := range cs[i].pot {
			si += v * s.weight[t]
		}
		for t, v := range cs[j].pot {
			sj += v * s.weight[t]
		}
		if si != sj {
			return si > sj
		}
		if a, b := slotScore(cs[i].slots), slotScore(cs[j].slots); a != b {
			return a > b
		}
		return cs[i].def > cs[j].def
	})
	var out []cand
	for i := range cs {
		dom := false
		for j := range out {
			if dominates(&out[j], &cs[i]) {
				dom = true
				break
			}
		}
		if !dom {
			out = append(out, cs[i])
		}
	}
	return out
}

func (s *solver) bestPerSize(skill string, on string, size int) int {
	best := 0
	list := s.armorDeco
	if on == "weapon" {
		list = s.wpnDeco
	}
	for _, d := range list {
		if d.Lv <= size {
			if v := d.Sk[skill]; v > best {
				best = v
			}
		}
	}
	return best
}

func (s *solver) mkCand(key string, skills map[string]int, slots []int, isWpn bool) cand {
	c := cand{key: key, slots: slots, isWpn: isWpn, skills: skills}
	c.vec = make([]int, len(s.tk))
	c.pot = make([]int, len(s.tk))
	on := "armor"
	if isWpn {
		on = "weapon"
	}
	for t, id := range s.tk {
		c.vec[t] = skills[id]
		c.pot[t] = c.vec[t]
		if !s.isSet[t] {
			for _, sz := range slots {
				if sz > 0 {
					c.pot[t] += s.bestPerSize(id, on, sz)
				}
			}
		}
	}
	return c
}

func Solve(req CalcReq, game string) CalcResp {
	start := time.Now()
	secs := req.Seconds
	if secs <= 0 {
		secs = 6
	}
	if secs < 2 {
		secs = 2
	}
	if secs > 60 {
		secs = 60
	}
	limit := 25 // longer searches keep more results
	if secs*2 > limit {
		limit = secs * 2
	}
	if limit > 100 {
		limit = 100
	}
	s := &solver{req: req, limit: limit, deadline: start.Add(time.Duration(secs) * time.Second)}
	resp := CalcResp{}
	var own *owned
	if req.Owned {
		own = loadOwned(game, req.WType)
		resp.OwnedOK = own != nil
	}
	for _, t := range req.Targets {
		sk, ok := BDATA.Skills[t.Skill]
		if !ok {
			continue
		}
		w := t.Want
		if w <= 0 || w > sk.Max {
			w = sk.Max
		}
		s.tk = append(s.tk, t.Skill)
		s.want = append(s.want, w)
		s.must = append(s.must, t.Must)
		s.isSet = append(s.isSet, sk.K == "set" || sk.K == "group")
		s.ranks = append(s.ranks, sk.R)
	}
	if len(s.tk) == 0 {
		return resp
	}
	s.weight = make([]int, len(s.tk))
	for t := range s.tk {
		w := 1
		for k := t + 1; k < len(s.tk) && k < t+4; k++ {
			w *= 8
		}
		s.weight[t] = w
	}
	relevant := func(sk map[string]int) bool {
		for _, id := range s.tk {
			if sk[id] > 0 {
				return true
			}
		}
		return false
	}
	for _, d := range BDATA.Decos {
		if !relevant(d.Sk) {
			continue
		}
		if own != nil && own.Decos[d.I] <= 0 {
			continue
		}
		if d.On == "weapon" {
			s.wpnDeco = append(s.wpnDeco, d)
		} else {
			s.armorDeco = append(s.armorDeco, d)
		}
	}
	if own != nil {
		s.decoLeft = map[string]int{}
		for k, v := range own.Decos {
			s.decoLeft[k] = v
		}
	}
	excl := map[int]bool{}
	for _, e := range req.Exclude {
		excl[e] = true
	}
	exW, exT := map[int]bool{}, map[string]bool{}
	for _, e := range req.ExclWeap {
		exW[e] = true
	}
	for _, e := range req.ExclTal {
		exT[e] = true
	}

	// weapon candidates
	var wc []cand
	if req.VirtSlots != nil {
		c := s.mkCand("weapon", map[string]int{}, req.VirtSlots, true)
		c.id = -1
		wc = append(wc, c)
	}
	for _, w := range BDATA.Weapons[req.WType] {
		if req.VirtSlots != nil {
			break
		}
		if req.Weapon != nil && w.I != *req.Weapon {
			continue
		}
		if req.Weapon == nil && own != nil && !own.Weapons[w.I] {
			continue
		}
		if req.Weapon == nil && w.Rar < req.MinRarity {
			continue
		}
		if req.Weapon == nil && exW[w.I] {
			continue
		}
		c := s.mkCand("weapon", w.Sk, w.Sl, true)
		c.id, c.def = w.I, w.Def
		wc = append(wc, c)
	}
	if req.Weapon == nil {
		wc = s.prune(wc)
	}
	s.slots = append(s.slots, wc)

	// armor candidates
	for _, k := range []string{"head", "chest", "arms", "waist", "legs"} {
		var ac []cand
		for _, a := range BDATA.Armor {
			if a.K != k || excl[a.I] {
				continue
			}
			if lid, ok := req.Locks[k]; ok && lid != a.I {
				continue
			}
			if _, locked := req.Locks[k]; !locked {
				if own != nil && !own.Armor[a.I] {
					continue
				}
				if a.Rar < req.MinRarity {
					continue
				}
			}
			c := s.mkCand(k, a.Sk, a.Sl, false)
			c.id, c.def = a.I, a.Def.Base
			ac = append(ac, c)
		}
		ac = s.prune(ac)
		s.slots = append(s.slots, ac)
	}

	// talisman candidates
	var tc []cand
	switch req.Talisman {
	case "none":
	case "any", "":
		for _, t := range BDATA.Talismans {
			if own != nil && !own.Tal[t.I] {
				continue
			}
			if exT[t.I] {
				continue
			}
			if !relevant(t.Sk) {
				continue
			}
			c := s.mkCand("tal", t.Sk, nil, false)
			c.sid = t.I
			tc = append(tc, c)
		}
		tc = s.prune(tc)
	default:
		for _, t := range BDATA.Talismans {
			if t.I == req.Talisman {
				c := s.mkCand("tal", t.Sk, nil, false)
				c.sid = t.I
				tc = append(tc, c)
			}
		}
	}
	tc = append(tc, cand{key: "tal", vec: make([]int, len(s.tk)), pot: make([]int, len(s.tk))}) // "no talisman"
	s.slots = append(s.slots, tc)

	if len(wc) == 0 {
		resp.Bottle = "No weapon matches (check the weapon type, or turn off 'only gear I own')."
		return resp
	}
	for i := 1; i <= 5; i++ {
		if len(s.slots[i]) == 0 {
			resp.Bottle = "No armor available for one of the slots with these settings."
			return resp
		}
	}

	// optimistic suffix sums
	n := len(s.slots)
	s.suffix = make([][]int, n+1)
	s.suffix[n] = make([]int, len(s.tk))
	for p := n - 1; p >= 0; p-- {
		s.suffix[p] = make([]int, len(s.tk))
		for t := range s.tk {
			best := 0
			for _, c := range s.slots[p] {
				if c.pot[t] > best {
					best = c.pot[t]
				}
			}
			s.suffix[p][t] = s.suffix[p+1][t] + best
		}
	}
	s.pick = make([]*cand, n)
	for i := 0; i < n; i++ {
		s.bufNP = append(s.bufNP, make([]int, len(s.tk)))
		s.bufOpt = append(s.bufOpt, make([]int, len(s.tk)))
	}
	s.dfs(0, make([]int, len(s.tk)))

	sort.SliceStable(s.results, func(i, j int) bool { return s.better(&s.results[i], &s.results[j]) })
	resp.Results = s.results
	resp.Complete = !s.timedOut
	resp.Checked = s.checked
	resp.Millis = time.Since(start).Milliseconds()
	if len(resp.Results) > 0 {
		resp.Room = s.room(&resp.Results[0], own)
	} else {
		resp.Room = []Suggestion{}
	}
	if len(resp.Results) > 0 {
		for t := range s.tk {
			if resp.Results[0].Achieved[t] < s.want[t] {
				resp.Bottle = BDATA.Skills[s.tk[t]].N + " can only reach " + strconv.Itoa(resp.Results[0].Achieved[t]) + "/" + strconv.Itoa(s.want[t]) + " together with the skills above it."
				break
			}
		}
	}
	return resp
}

func (s *solver) levelFromPot(t, v int) int {
	if s.isSet[t] {
		return setLevel(s.ranks[t], v)
	}
	if v > s.want[t] {
		return s.want[t]
	}
	return v
}

// compare achieved vectors; returns -1, 0, 1
func cmpVec(a, b []int) int {
	for i := range a {
		if a[i] != b[i] {
			if a[i] > b[i] {
				return 1
			}
			return -1
		}
	}
	return 0
}

func (s *solver) better(a, b *CalcBuild) bool {
	if c := cmpVec(a.Achieved, b.Achieved); c != 0 {
		return c > 0
	}
	if a.FreeSlot != b.FreeSlot {
		return a.FreeSlot > b.FreeSlot
	}
	return a.Defense > b.Defense
}

func (s *solver) dfs(p int, pot []int) {
	if s.timedOut {
		return
	}
	if p == len(s.slots) {
		s.leaf()
		return
	}
	if s.checked&1023 == 0 && time.Now().After(s.deadline) {
		s.timedOut = true
		return
	}
	np, opt := s.bufNP[p], s.bufOpt[p]
	for i := range s.slots[p] {
		c := &s.slots[p][i]
		for t := range pot {
			np[t] = pot[t] + c.pot[t]
			opt[t] = s.levelFromPot(t, np[t]+s.suffix[p+1][t])
		}
		mustFail := false
		for t := range s.tk {
			if s.must[t] && opt[t] < s.want[t] {
				mustFail = true
				break
			}
		}
		if mustFail {
			continue
		}
		if len(s.results) >= s.limit {
			worst := s.results[len(s.results)-1].Achieved
			c := cmpVec(opt, worst)
			if c < 0 || (c == 0 && cmpVec(worst, s.want) == 0) {
				continue
			}
		}
		s.pick[p] = c
		s.dfs(p+1, np)
		if s.timedOut {
			return
		}
	}
}

type freeSlot struct {
	key  string
	size int
	wpn  bool
}

func (s *solver) leaf() {
	s.checked++
	if s.checked&1023 == 0 && time.Now().After(s.deadline) {
		s.timedOut = true
		return
	}
	skills := map[string]int{}
	setCount := map[string]int{}
	var free []freeSlot
	def := 0
	for _, c := range s.pick {
		if c == nil {
			continue
		}
		def += c.def
		for id, v := range c.skills {
			if sk, ok := BDATA.Skills[id]; ok && (sk.K == "set" || sk.K == "group") {
				setCount[id] += v
			} else {
				skills[id] += v
			}
		}
		for j, sz := range c.slots {
			if sz > 0 {
				free = append(free, freeSlot{key: c.key + ":" + strconv.Itoa(j), size: sz, wpn: c.isWpn})
			}
		}
	}
	// quick reject before fitting decorations
	if len(s.results) >= s.limit {
		opt := make([]int, len(s.tk))
		for t, id := range s.tk {
			if s.isSet[t] {
				opt[t] = setLevel(s.ranks[t], setCount[id])
				continue
			}
			v := skills[id]
			for _, f := range free {
				on := "armor"
				if f.wpn {
					on = "weapon"
				}
				v += s.bestPerSize(id, on, f.size)
			}
			opt[t] = s.levelFromPot(t, v)
		}
		if cmpVec(opt, s.results[len(s.results)-1].Achieved) < 0 {
			return
		}
	}
	// fit decorations in priority order
	sort.SliceStable(free, func(i, j int) bool { return free[i].size < free[j].size })
	used := make([]bool, len(free))
	decos := map[string]string{}
	left := map[string]int{}
	for k, v := range s.decoLeft {
		left[k] = v
	}
	for t, id := range s.tk {
		if s.isSet[t] {
			continue
		}
		for skills[id] < s.want[t] {
			bestI, bestD, bestScore := -1, -1, -1
			for fi, f := range free {
				if used[fi] {
					continue
				}
				list := s.armorDeco
				if f.wpn {
					list = s.wpnDeco
				}
				for di, d := range list {
					if d.Lv > f.size || d.Sk[id] == 0 {
						continue
					}
					if s.decoLeft != nil && left[d.I] <= 0 {
						continue
					}
					gain := d.Sk[id]
					if need := s.want[t] - skills[id]; gain > need {
						gain = need
					}
					bonus := 0
					for t2 := t + 1; t2 < len(s.tk); t2++ {
						if v := d.Sk[s.tk[t2]]; v > 0 && skills[s.tk[t2]] < s.want[t2] {
							bonus += v
						}
					}
					score := gain*1000 + bonus*100 - f.size*10 - d.Lv
					if score > bestScore {
						bestScore, bestI, bestD = score, fi, di
					}
				}
			}
			if bestI < 0 {
				break
			}
			list := s.armorDeco
			if free[bestI].wpn {
				list = s.wpnDeco
			}
			d := list[bestD]
			used[bestI] = true
			decos[free[bestI].key] = d.I
			if s.decoLeft != nil {
				left[d.I]--
			}
			for k, v := range d.Sk {
				skills[k] += v
			}
		}
	}
	ach := make([]int, len(s.tk))
	for t, id := range s.tk {
		if s.isSet[t] {
			ach[t] = setLevel(s.ranks[t], setCount[id])
		} else {
			ach[t] = s.levelFromPot(t, skills[id])
		}
	}
	freeSize := 0
	for i, f := range free {
		if !used[i] {
			freeSize += f.size
		}
	}
	for id, c := range setCount {
		if lv := setLevel(BDATA.Skills[id].R, c); lv > 0 {
			skills[id] = lv
		}
	}
	for t := range s.tk {
		if s.must[t] && ach[t] < s.want[t] {
			return
		}
	}
	var left2 []freeSlot
	for i, f := range free {
		if !used[i] {
			left2 = append(left2, f)
		}
	}
	b := CalcBuild{Armor: map[string]*int{}, Decos: decos, Achieved: ach, Skills: skills, Defense: def, FreeSlot: freeSize, free: left2}
	for _, c := range s.pick {
		if c == nil {
			continue
		}
		switch c.key {
		case "weapon":
			v := c.id
			b.Weapon = &v
		case "tal":
			if c.sid != "" {
				v := c.sid
				b.Talisman = &v
			}
		default:
			v := c.id
			b.Armor[c.key] = &v
		}
	}
	// insert keeping the top `limit`
	if len(s.results) >= s.limit && !s.better(&b, &s.results[len(s.results)-1]) {
		return
	}
	pos := sort.Search(len(s.results), func(i int) bool { return s.better(&b, &s.results[i]) })
	s.results = append(s.results, CalcBuild{})
	copy(s.results[pos+1:], s.results[pos:])
	s.results[pos] = b
	if len(s.results) > s.limit {
		s.results = s.results[:s.limit]
	}
}

// room: which extra skills still fit into the best build's free slots.
func (s *solver) room(b *CalcBuild, own *owned) []Suggestion {
	in := map[string]bool{}
	for _, id := range s.tk {
		in[id] = true
	}
	var out []Suggestion
	for id, sk := range BDATA.Skills {
		if in[id] || (sk.K != "armor" && sk.K != "weapon") {
			continue
		}
		cur := b.Skills[id]
		room := sk.Max - cur
		if room <= 0 {
			continue
		}
		add := 0
		// biggest gains first: use each free slot for the best decoration of this skill
		sizes := append([]freeSlot(nil), b.free...)
		sort.Slice(sizes, func(i, j int) bool { return sizes[i].size > sizes[j].size })
		for _, f := range sizes {
			if add >= room {
				break
			}
			best := 0
			for _, d := range BDATA.Decos {
				if d.Lv > f.size || (d.On == "weapon") != f.wpn {
					continue
				}
				if own != nil && own.Decos[d.I] <= 0 {
					continue
				}
				if v := d.Sk[id]; v > best {
					best = v
				}
			}
			add += best
		}
		if add > room {
			add = room
		}
		if add > 0 {
			out = append(out, Suggestion{Skill: id, Levels: add, Total: cur + add})
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Levels != out[j].Levels {
			return out[i].Levels > out[j].Levels
		}
		return BDATA.Skills[out[i].Skill].N < BDATA.Skills[out[j].Skill].N
	})
	if len(out) > 14 {
		out = out[:14]
	}
	return out
}
