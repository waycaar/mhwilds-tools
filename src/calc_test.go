package main

import (
	"testing"
)

func skillID(name string) string {
	for id, s := range BDATA.Skills {
		if s.N == name {
			return id
		}
	}
	return ""
}

func TestCalc(t *testing.T) {
	if err := loadGameData(); err != nil {
		t.Fatal(err)
	}
	if err := loadBuildEngine(); err != nil {
		t.Fatal(err)
	}
	req := CalcReq{WType: "long-sword", Talisman: "any", Targets: []CalcTarget{
		{Skill: skillID("Weakness Exploit"), Want: 5},
		{Skill: skillID("Critical Boost"), Want: 5},
		{Skill: skillID("Agitator"), Want: 5},
		{Skill: skillID("Maximum Might"), Want: 3},
		{Skill: skillID("Attack Boost"), Want: 5},
	}}
	for _, x := range req.Targets {
		if x.Skill == "" {
			t.Fatal("missing skill")
		}
	}
	r := Solve(req, "")
	t.Logf("results=%d complete=%v checked=%d ms=%d bottleneck=%q", len(r.Results), r.Complete, r.Checked, r.Millis, r.Bottle)
	for i, b := range r.Results {
		if i > 2 {
			break
		}
		t.Logf("#%d achieved=%v free=%d def=%d decos=%d", i, b.Achieved, b.FreeSlot, b.Defense, len(b.Decos))
		for k, v := range b.Armor {
			for _, a := range BDATA.Armor {
				if a.I == *v {
					t.Logf("   %s: %s", k, a.N)
				}
			}
		}
		if b.Talisman != nil {
			t.Logf("   tal: %s", *b.Talisman)
		}
	}
	if len(r.Results) == 0 {
		t.Fatal("no results")
	}
}
