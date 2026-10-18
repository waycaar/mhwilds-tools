package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestMain(m *testing.M) {
	// official quest files, the same ones Permanent Event Quest keeps in its quests folder
	templateRoot = func() string { return "testdata/peq" }
	os.Exit(m.Run())
}

func TestBuildRoundTrip(t *testing.T) {
	if _, err := os.Stat("testdata/peq/quests/23478.raw.json"); err != nil {
		t.Skip("no quest templates in testdata/peq (copy them from your Permanent Event Quest quests folder)")
	}
	if err := loadGameData(); err != nil {
		t.Fatal(err)
	}
	s := &QuestSpec{ID: 90001, Title: "Test Hunt", Client: "Quest Maker", Description: "Three Tempered Arkveld have appeared in the Wounded Hollow. Show them what you are capable of, hunter, and bring back proof.", AutoWrap: true,
		Stage: "st401", Star: 10, Objective: "hunt", TimeLimit: 50, Faints: 3, MaxPlayers: 4, HRReq: 100, Money: 40320, HRP: 3500, Env: "Fallow",
		Monsters: []MonsterSpec{
			{EmID: 746996864, Variant: "arch", RankGUID: "6d893ac4-5f81-4850-b1ac-a2c23845cb15", SizeMode: "fixed", FixedSize: 110},
			{EmID: -535078400, Variant: "tempered", RankGUID: "92666b5d-ef17-4e5c-90d5-a07e97ee57ac", SizeMode: "random", SizeGUID: "cfdb8941-1671-4ced-b673-7a4bd98d9a65"},
			{EmID: 2129596800, Variant: "normal", RankGUID: "92666b5d-ef17-4e5c-90d5-a07e97ee57ac", SizeMode: "fixed", FixedSize: 100},
		},
		Rewards: []RewardSpec{{824, "Battle-tempered Emblem", 1, 2, 100}}}
	for _, i := range Validate(s) {
		t.Log(i.Level, i.Msg)
	}
	raw, ext, err := Build(s)
	if err != nil {
		t.Fatal(err)
	}
	os.WriteFile(filepath.Join(os.TempDir(), "out.raw.json"), raw, 0644)
	os.WriteFile(filepath.Join(os.TempDir(), "out.ext.json"), ext, 0644)
	var any1 map[string]any
	if err := json.Unmarshal(raw, &any1); err != nil {
		t.Fatal(err)
	}
	p, err := Parse(raw, ext)
	if err != nil {
		t.Fatal(err)
	}
	a, _ := json.Marshal(s)
	p.AutoWrap = true
	p.Description = s.Description
	b, _ := json.Marshal(p)
	if string(a) != string(b) {
		t.Fatalf("round trip mismatch\n%s\n%s", a, b)
	}
	// every stage builds
	for _, st := range GD.Stages {
		s2 := *s
		s2.Stage = st.Code
		if _, _, err := Build(&s2); err != nil {
			t.Fatalf("%s: %v", st.Code, err)
		}
	}
}

func TestTemplateFallbackAndMissing(t *testing.T) {
	if err := loadGameData(); err != nil {
		t.Fatal(err)
	}
	src, err := os.ReadFile("testdata/peq/quests/24234.raw.json") // Windward Plains
	if err != nil {
		t.Skip("no quest templates in testdata/peq")
	}
	old := templateRoot
	defer func() { templateRoot = old }()
	dir := t.TempDir()
	os.MkdirAll(filepath.Join(dir, "quests", "sub"), 0o755)
	templateRoot = func() string { return dir }
	st := GD.stage("st101")
	if _, err := findTemplate(st); err == nil {
		t.Fatal("expected missing template error")
	}
	// another official quest on the same map, in a subfolder, is used instead
	os.WriteFile(filepath.Join(dir, "quests", "sub", "12345.raw.json"), src, 0o644)
	p, err := findTemplate(st)
	if err != nil || filepath.Base(p) != "12345.raw.json" {
		t.Fatalf("fallback not used: %v %s", err, p)
	}
	// a custom quest (ID 90000+) is never used as a template
	os.Remove(p)
	os.WriteFile(filepath.Join(dir, "quests", "90001.raw.json"), src, 0o644)
	if _, err := findTemplate(st); err == nil {
		t.Fatal("custom quest used as template")
	}
}
