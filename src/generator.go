package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"
)

// ---------- What the editor sends ----------

type MonsterSpec struct {
	EmID      int64  `json:"emId"`
	Variant   string `json:"variant"`  // normal | tempered | arch
	RankGUID  string `json:"rankGuid"` // difficulty rank (sets HP / damage)
	SizeMode  string `json:"sizeMode"` // fixed | random
	FixedSize int    `json:"fixedSize"`
	SizeGUID  string `json:"sizeGuid"`
}

type RewardSpec struct {
	ItemID   int    `json:"itemId"`
	ItemName string `json:"itemName"`
	Min      int    `json:"min"`
	Max      int    `json:"max"`
	Prob     int    `json:"prob"`
}

type QuestSpec struct {
	ID          int           `json:"id"`
	Title       string        `json:"title"`
	Client      string        `json:"client"`
	Description string        `json:"description"`
	AutoWrap    bool          `json:"autoWrap"`
	Stage       string        `json:"stage"`
	Star        int           `json:"star"`
	Objective   string        `json:"objective"` // hunt | slay | capture
	TimeLimit   int           `json:"timeLimit"`
	Faints      int           `json:"faints"`
	MaxPlayers  int           `json:"maxPlayers"`
	HRReq       int           `json:"hrReq"`
	Money       int           `json:"money"`
	HRP         int           `json:"hrp"`
	Env         string        `json:"env"`
	Monsters    []MonsterSpec `json:"monsters"`
	Rewards     []RewardSpec  `json:"rewards"`
}

// Marker in message GUIDs so the app can recognise quests it made.
const guidMarker = "-ca11-4000-8000-0000000001"
const zeroGUID = "00000000-0000-0000-0000-000000000000"

var legendary = map[string]string{"normal": "NONE", "tempered": "NORMAL", "arch": "KING"}
var objectives = map[string][2]int{"hunt": {0, 1}, "slay": {1, 2}, "capture": {2, 3}}

// Spread-out spawn points used in the Arena when several monsters are placed by position.
var arenaPositions = []string{
	"(-311.00476,-28.134827,156.11992)",
	"(-331.6772,-29.278572,146.37274)",
	"(-249.86357,-25.02079,146.7028)",
	"(-247.01321,-20.167076,136.30652)",
	"(-322.22495,-28.091208,157.14355)",
}

type Issue struct {
	Level string `json:"level"` // error | warn
	Msg   string `json:"msg"`
}

// Validate checks a spec. Errors block installing; warnings are shown but allowed.
func Validate(s *QuestSpec) []Issue {
	var out []Issue
	e := func(f string, a ...any) { out = append(out, Issue{"error", fmt.Sprintf(f, a...)}) }
	w := func(f string, a ...any) { out = append(out, Issue{"warn", fmt.Sprintf(f, a...)}) }

	if s.ID < 1 || s.ID > 99999999 {
		e("Quest ID must be between 1 and 99999999.")
	}
	if strings.TrimSpace(s.Title) == "" {
		e("Give the quest a name.")
	} else if utf8.RuneCountInString(s.Title) > 40 {
		w("Quest name is long (%d characters) and may be cut off on the quest board.", utf8.RuneCountInString(s.Title))
	}
	st := GD.stage(s.Stage)
	if st == nil {
		e("Pick a map.")
	} else if _, err := findTemplate(st); err != nil {
		e("%s: no official quest for this map was found in the Permanent Event Quest mod's quests folder. Install or reinstall the mod, or pick another map.", st.Name)
	}
	if s.Star < 1 || s.Star > 10 {
		e("Star rating must be 1 to 10.")
	}
	if _, ok := objectives[s.Objective]; !ok {
		e("Pick an objective (hunt, slay or capture).")
	}
	if s.TimeLimit < 5 || s.TimeLimit > 60 {
		e("Time limit must be 5 to 60 minutes.")
	}
	if s.Faints < 1 || s.Faints > 10 {
		e("Faints allowed must be 1 to 10.")
	}
	if s.MaxPlayers < 1 || s.MaxPlayers > 4 {
		e("Max players must be 1 to 4.")
	}
	if s.HRReq < 1 || s.HRReq > 999 {
		e("HR requirement must be 1 to 999.")
	}
	if s.Money < 0 || s.Money > 9999999 {
		e("Reward money must be 0 to 9,999,999z.")
	}
	if s.HRP < 0 || s.HRP > 99999 {
		e("HR points must be 0 to 99,999.")
	}
	if GD.env(s.Env) == nil {
		e("Pick an environment.")
	}
	if len(s.Monsters) == 0 {
		e("Add at least one monster.")
	}
	if len(s.Monsters) > 5 {
		e("A quest can have at most 5 monsters.")
	}
	for i, m := range s.Monsters {
		n := i + 1
		mon := GD.monster(m.EmID)
		name := fmt.Sprintf("Monster %d", n)
		if mon != nil {
			name = fmt.Sprintf("Monster %d (%s)", n, mon.Name)
		}
		if _, ok := legendary[m.Variant]; !ok {
			e("%s: pick Normal, Tempered or Arch-Tempered.", name)
		}
		if GD.rankByGUID(m.RankGUID) == nil {
			e("%s: pick a strength.", name)
		}
		switch m.SizeMode {
		case "fixed":
			if m.FixedSize < 50 || m.FixedSize > 150 {
				e("%s: fixed size must be 50 to 150%%.", name)
			}
		case "random":
			if GD.sizeByGUID(m.SizeGUID) == nil {
				e("%s: pick a size table.", name)
			}
		default:
			e("%s: pick a size option.", name)
		}
		if mon == nil {
			continue
		}
		if m.Variant == "arch" && !mon.Arch {
			e("%s: %s doesn't come as Arch-Tempered. Pick Normal or Tempered.", name, mon.Name)
		}
		if st != nil {
			if _, ok := GD.Placements[st.Code+":"+strconv.FormatInt(m.EmID, 10)]; !ok {
				if st.Code != "st401" {
					w("%s: %s has never appeared in an official quest on %s, so check that it spawns. The Arena always works.", name, mon.Name, st.Name)
				}
			}
		}
	}
	if len(s.Rewards) > 16 {
		e("At most 16 reward items.")
	}
	for i, r := range s.Rewards {
		n := i + 1
		if r.ItemID <= 0 {
			e("Reward %d: item ID must be a positive number.", n)
		}
		if r.Min < 1 || r.Max < r.Min || r.Max > 99 {
			e("Reward %d: amounts must be 1 to 99 with min ≤ max.", n)
		}
		if r.Prob < 1 || r.Prob > 100 {
			e("Reward %d: chance must be 1 to 100%%.", n)
		}
	}
	return out
}

func hasErrors(is []Issue) bool {
	for _, i := range is {
		if i.Level == "error" {
			return true
		}
	}
	return false
}

// ---------- small helpers for the untyped JSON tree ----------

func obj(m any, keys ...string) map[string]any {
	cur := m.(map[string]any)
	for _, k := range keys {
		cur = cur[k].(map[string]any)
	}
	return cur
}

func deepCopy(v any) any {
	switch t := v.(type) {
	case map[string]any:
		n := make(map[string]any, len(t))
		for k, x := range t {
			n[k] = deepCopy(x)
		}
		return n
	case []any:
		n := make([]any, len(t))
		for i, x := range t {
			n[i] = deepCopy(x)
		}
		return n
	default:
		return v
	}
}

func num(v int64) json.Number { return json.Number(strconv.FormatInt(v, 10)) }

func msgGUID(id int, slot int) string {
	p := strconv.Itoa(id)
	p = p + strings.Repeat("0", 8-len(p))
	return fmt.Sprintf("%s%s%02d", p, guidMarker, slot)
}

// wrapText breaks long lines for the narrow quest-board text box.
func wrapText(s string, width int) string {
	var out []string
	for _, para := range strings.Split(s, "\n") {
		words := strings.Fields(para)
		if len(words) == 0 {
			out = append(out, "")
			continue
		}
		line := ""
		for _, wd := range words {
			if line == "" {
				line = wd
			} else if utf8.RuneCountInString(line)+1+utf8.RuneCountInString(wd) <= width {
				line += " " + wd
			} else {
				out = append(out, line)
				line = wd
			}
		}
		out = append(out, line)
	}
	return strings.Join(out, "\n")
}

func gameText(s string, wrap bool) string {
	s = strings.ReplaceAll(s, "\r\n", "\n")
	s = strings.TrimSpace(s)
	if wrap {
		s = wrapText(s, 56)
	}
	return strings.ReplaceAll(s, "\n", "\r\n")
}

// ---------- Build ----------

// Build turns a spec into the two files Permanent Event Quest loads.
func Build(s *QuestSpec) (raw []byte, ext []byte, err error) {
	if is := Validate(s); hasErrors(is) {
		for _, i := range is {
			if i.Level == "error" {
				return nil, nil, fmt.Errorf("%s", i.Msg)
			}
		}
	}
	st := GD.stage(s.Stage)
	q, err := loadTemplate(st.Code)
	if err != nil {
		return nil, nil, err
	}
	dl := obj(q, "_DataList")
	bz := obj(q, "_BossZakoDataList")
	obje := objectives[s.Objective]

	dl["_MissionId"] = map[string]any{"_Name": s.Title, "_Value": num(int64(s.ID))}
	dl["_QuestLv"] = num(int64(s.Star))
	dl["_QuestType"] = num(int64(obje[0]))
	dl["_TimeLimit"] = num(int64(s.TimeLimit))
	dl["_QuestLife"] = num(int64(s.Faints))
	dl["_RemMoney"] = num(int64(s.Money))
	dl["_HRPoint"] = num(int64(s.HRP))
	dl["_SubBossInfoArray"] = []any{}
	oc := obj(dl, "_OrderCondition")
	oc["_MaxPlayerNum"] = num(int64(s.MaxPlayers))
	oc["_OrderHR"] = num(int64(s.HRReq))

	qm := obj(dl, "_QuestMsg")
	qm["_TitleMsg"] = msgGUID(s.ID, 0)
	qm["_ClientNameMsg"] = msgGUID(s.ID, 1)
	qm["_DetailMsg"] = msgGUID(s.ID, 2)
	qm["_FailConditionMsg_Other"] = msgGUID(s.ID, 3)
	qm["_OrderConditionMsg_Other"] = msgGUID(s.ID, 4)
	qm["_OrderConditionMsg_StProgress"] = msgGUID(s.ID, 5)

	// Monsters
	baseTargets := bz["_MainTargetDataList"].([]any)
	base := baseTargets[0].(map[string]any)
	var targets, infos []any
	explicitIdx := 0
	for i, m := range s.Monsters {
		t := deepCopy(base).(map[string]any)
		leg := legendary[m.Variant]
		rank := GD.rankByGUID(m.RankGUID)
		t["_EmID"] = num(m.EmID)
		t["_LegendaryID"] = leg
		t["_RoleID"] = "NORMAL"
		t["_GroupID"] = num(0)
		t["_StoryTargetID"] = num(int64(101 + i))
		t["_OptionTag"] = map[string]any{"Value": num(0)}
		t["_DifficultyRankId"] = map[string]any{"Name": rank.Name, "Value": rank.GUID}
		if m.SizeMode == "fixed" {
			t["_IsUseRandomSize"] = false
			t["_FixedSize"] = num(int64(m.FixedSize))
			t["_RandomSizeTblId"] = map[string]any{"Name": "", "Value": zeroGUID}
		} else {
			sz := GD.sizeByGUID(m.SizeGUID)
			t["_IsUseRandomSize"] = true
			t["_FixedSize"] = num(100)
			t["_RandomSizeTblId"] = map[string]any{"Name": sz.Name, "Value": sz.GUID}
		}
		p, known := GD.Placements[st.Code+":"+strconv.FormatInt(m.EmID, 10)]
		if !known {
			if st.Code == "st401" {
				p = Placement{Route: zeroGUID, AreaNo: 1, SetAreaNo: 255, InitPos: arenaPositions[0]}
			} else {
				p = Placement{Route: zeroGUID, AreaNo: toInt(base["_AreaNo"]), SetAreaNo: toInt(base["_SetAreaNo"]), InitPos: fmt.Sprint(base["_InitPos"])}
			}
		}
		if p.AreaNo != 255 && st.Code == "st401" {
			p.InitPos = arenaPositions[explicitIdx%len(arenaPositions)]
			explicitIdx++
		}
		t["_RouteID"] = map[string]any{"Name": "", "_Value": p.Route}
		t["_AreaNo"] = num(int64(p.AreaNo))
		t["_SetAreaNo"] = num(int64(p.SetAreaNo))
		t["_InitPos"] = p.InitPos
		targets = append(targets, t)

		infos = append(infos, map[string]any{
			"_ConditionalMoveData": map[string]any{"_DestArray": []any{}, "_IsUse": false, "_RevertOnCompleted": false, "_StartAfterFirstCondition": false},
			"_EmTargetID":          num(int64(101 + i)),
			"_LegendaryID":         leg,
			"_RoleID":              "NORMAL",
			"_ShowTargetGuide":     true,
			"_TargetIDValue":       num(m.EmID),
			"_TargetValue":         num(1),
		})
	}
	bz["_MainTargetDataList"] = targets
	bz["_SubBossLayoutID"] = map[string]any{"_ID": zeroGUID, "_Resource": nil}
	cc := obj(dl, "_ClearCondition")
	cc["_TargetInfoArray"] = infos
	cc["_TargetType"] = num(int64(obje[1]))

	// Environment
	env := GD.env(s.Env)
	sq := obj(q, "_StreamQuestData")
	for _, e := range sq["_SetEnvironmentDataList"].([]any) {
		em := e.(map[string]any)
		em["_EnvType"] = map[string]any{"_Name": env.Name, "_Value": num(env.ID)}
	}

	// Text, copied into every language the game ships
	title := gameText(s.Title, false)
	client := gameText(s.Client, false)
	desc := gameText(s.Description, s.AutoWrap)
	prefix := fmt.Sprintf("Mission%d_", s.ID)
	var langs []any
	for _, l := range q["_MessageAssetList"].([]any) {
		lm := l.(map[string]any)
		md := []any{}
		for _, k := range []string{"000", "001", "100", "101", "102", "122", "123", "132"} {
			txt := ""
			switch k {
			case "100":
				txt = title
			case "101":
				txt = client
			case "102":
				txt = desc
			}
			md = append(md, map[string]any{"Name": prefix + k, "Text": txt})
		}
		langs = append(langs, map[string]any{"Language": lm["Language"], "MessageData": md})
	}
	q["_MessageAssetList"] = langs
	q["_IsRecommended"] = false

	raw, err = marshal(q)
	if err != nil {
		return nil, nil, err
	}

	items := []any{}
	for _, r := range s.Rewards {
		items = append(items, map[string]any{
			"itemId": r.ItemID, "itemName": r.ItemName, "minCount": r.Min, "maxCount": r.Max, "probability": r.Prob,
		})
	}
	ext, err = marshal(map[string]any{"questId": s.ID, "rewardId": 0, "rewardItems": items})
	return raw, ext, err
}

func marshal(v any) ([]byte, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "    ")
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func toInt(v any) int {
	switch t := v.(type) {
	case json.Number:
		i, _ := t.Int64()
		return int(i)
	case float64:
		return int(t)
	}
	return 0
}

// ---------- Parse (load an existing quest back into the editor) ----------

var stageCodeRe = regexp.MustCompile(`^st\d{3}`)

func decodeNum(b []byte) (map[string]any, error) {
	b = bytes.TrimPrefix(b, []byte("\xef\xbb\xbf"))
	dec := json.NewDecoder(bytes.NewReader(b))
	dec.UseNumber()
	var m map[string]any
	err := dec.Decode(&m)
	return m, err
}

func englishText(q map[string]any) map[string]string {
	out := map[string]string{}
	list, _ := q["_MessageAssetList"].([]any)
	var pick map[string]any
	for _, l := range list {
		lm := l.(map[string]any)
		if toInt(lm["Language"]) == 1 {
			pick = lm
		}
	}
	if pick == nil && len(list) > 0 {
		pick = list[0].(map[string]any)
	}
	if pick == nil {
		return out
	}
	for _, x := range pick["MessageData"].([]any) {
		xm := x.(map[string]any)
		n := fmt.Sprint(xm["Name"])
		if i := strings.LastIndex(n, "_"); i >= 0 {
			out[n[i+1:]] = strings.ReplaceAll(fmt.Sprint(xm["Text"]), "\r\n", "\n")
		}
	}
	return out
}

// Parse reads a quest's raw/ext files into a spec the editor can show.
func Parse(rawB, extB []byte) (*QuestSpec, error) {
	q, err := decodeNum(rawB)
	if err != nil {
		return nil, err
	}
	dl := obj(q, "_DataList")
	bz := obj(q, "_BossZakoDataList")
	s := &QuestSpec{AutoWrap: false, Monsters: []MonsterSpec{}, Rewards: []RewardSpec{}}
	s.ID = toInt(obj(dl, "_MissionId")["_Value"])
	txt := englishText(q)
	s.Title, s.Client, s.Description = txt["100"], txt["101"], txt["102"]
	stID := int64(toInt(obj(dl, "_Stage")["_Value"]))
	if st := GD.stageByID(stID); st != nil {
		s.Stage = st.Code
	} else {
		s.Stage = stageCodeRe.FindString(fmt.Sprint(obj(dl, "_Stage")["_Name"]))
	}
	s.Star = toInt(dl["_QuestLv"])
	switch toInt(obj(dl, "_ClearCondition")["_TargetType"]) {
	case 2:
		s.Objective = "slay"
	case 3:
		s.Objective = "capture"
	default:
		s.Objective = "hunt"
	}
	s.TimeLimit = toInt(dl["_TimeLimit"])
	s.Faints = toInt(dl["_QuestLife"])
	s.Money = toInt(dl["_RemMoney"])
	s.HRP = toInt(dl["_HRPoint"])
	oc := obj(dl, "_OrderCondition")
	s.MaxPlayers = toInt(oc["_MaxPlayerNum"])
	s.HRReq = toInt(oc["_OrderHR"])
	s.Env = "Fallow"
	if sq, ok := q["_StreamQuestData"].(map[string]any); ok {
		if l, ok := sq["_SetEnvironmentDataList"].([]any); ok && len(l) > 0 {
			id := int64(toInt(obj(l[0], "_EnvType")["_Value"]))
			for _, e := range GD.Envs {
				if e.ID == id {
					s.Env = e.Label
				}
			}
		}
	}
	rev := map[string]string{"NONE": "normal", "NORMAL": "tempered", "KING": "arch"}
	for _, tt := range bz["_MainTargetDataList"].([]any) {
		t := tt.(map[string]any)
		m := MonsterSpec{EmID: int64(toInt(t["_EmID"])), Variant: rev[fmt.Sprint(t["_LegendaryID"])]}
		if m.Variant == "" {
			m.Variant = "normal"
		}
		m.RankGUID = fmt.Sprint(obj(t, "_DifficultyRankId")["Value"])
		if b, _ := t["_IsUseRandomSize"].(bool); b {
			m.SizeMode = "random"
			m.SizeGUID = fmt.Sprint(obj(t, "_RandomSizeTblId")["Value"])
		} else {
			m.SizeMode = "fixed"
			m.FixedSize = toInt(t["_FixedSize"])
		}
		s.Monsters = append(s.Monsters, m)
	}
	if len(extB) > 0 {
		if e, err := decodeNum(extB); err == nil {
			if items, ok := e["rewardItems"].([]any); ok {
				for _, it := range items {
					im := it.(map[string]any)
					s.Rewards = append(s.Rewards, RewardSpec{
						ItemID: toInt(im["itemId"]), ItemName: fmt.Sprint(im["itemName"]),
						Min: toInt(im["minCount"]), Max: toInt(im["maxCount"]), Prob: toInt(im["probability"]),
					})
				}
			}
		}
	}
	return s, nil
}

// madeByApp reports whether a raw quest file was written by this app.
func madeByApp(rawB []byte) bool { return bytes.Contains(rawB, []byte(guidMarker)) }
