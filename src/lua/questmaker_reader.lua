-- MH Wilds Tools: data reader
-- Read-only except for one thing you trigger yourself: writing a build into an EMPTY loadout slot.
-- What it does:
--   * exports your equipment box, loadouts and decorations (so the app can import them)
--   * writes a loadout the app sends you, only when you click the button, with an undo copy
--   * logs the large monsters you fight (time, result, weapon) for the Hunts tab
-- It does not scan game memory for anything else. Delete this file any time.

local VERSION = 9

local function hex(n, w) return string.format("%0" .. w .. "x", n) end

local function read_guid(obj, off)
  local ok, s = pcall(function()
    local d1 = obj:read_dword(off) & 0xFFFFFFFF
    local d2 = obj:read_short(off + 4) & 0xFFFF
    local d3 = obj:read_short(off + 6) & 0xFFFF
    local b = {}
    for i = 0, 7 do b[i] = obj:read_byte(off + 8 + i) & 0xFF end
    return hex(d1, 8) .. "-" .. hex(d2, 4) .. "-" .. hex(d3, 4) .. "-" ..
      hex(b[0], 2) .. hex(b[1], 2) .. "-" .. hex(b[2], 2) .. hex(b[3], 2) .. hex(b[4], 2) .. hex(b[5], 2) .. hex(b[6], 2) .. hex(b[7], 2)
  end)
  return ok and s or nil
end

local ctx_td = sdk.find_type_definition("app.cEnemyContext")
local get_is_angry = ctx_td and ctx_td:get_method("get_IsAngry")

-- ---------- gear export (equipment box + loadouts) ----------
-- Reads the gear part of your save while the game runs. Read-only.
local OUT_SAVE = "questmaker/gear_export.json"
local gear_status = "waiting for save data"
local auto_gear = true

local function val(e)
  if e == nil then return nil end
  if type(e) == "number" or type(e) == "boolean" or type(e) == "string" then return e end
  local ok, v = pcall(function() return e:get_field("m_value") end)
  if ok and v ~= nil then return v end
  ok, v = pcall(function() return tonumber(e:call("ToString()")) end)
  if ok then return v end
  return nil
end

local function arr_vals(a)
  local out = {}
  if a == nil then return out end
  local n = 0
  pcall(function() n = a:get_size() end)
  for i = 0, n - 1 do
    local ok, e = pcall(function() return a:get_element(i) end)
    local v = ok and val(e) or nil
    table.insert(out, v == nil and -1 or v)
  end
  return out
end

local function F(o, name)
  local ok, v = pcall(function() return o:get_field(name) end)
  if ok then return v end
  return nil
end

local function equip_root_early()
  local mgr = sdk.get_managed_singleton("app.SaveDataManager")
  if mgr == nil then return nil end
  local save = nil
  pcall(function() save = mgr:call("getCurrentUserSaveData") end)
  return save and F(save, "_Equip")
end

local function export_gear()
  local mgr = sdk.get_managed_singleton("app.SaveDataManager")
  if mgr == nil then gear_status = "save manager not ready"; return false end
  local save = nil
  for _, m in ipairs({ "getCurrentUserSaveData", "get_CurrentUserSaveData" }) do
    if save == nil then pcall(function() save = mgr:call(m) end) end
  end
  if save == nil then gear_status = "save data not found"; return false end
  local eq = F(save, "_Equip")
  if eq == nil then gear_status = "equipment data not found"; return false end
  local out = { tool = "MH Wilds Tools", format = 1, version = VERSION, time = os.date("%Y-%m-%d %H:%M:%S"),
                box = {}, loadouts = {}, accessories = {}, current = {} }
  -- equipment box
  local box = F(eq, "_EquipBox")
  local n = 0
  pcall(function() n = box:get_size() end)
  for i = 0, n - 1 do
    local w = box:get_element(i)
    local cg = F(w, "Category_Gender")
    if cg ~= nil and (cg >> 3) <= 4 then
      table.insert(out.box, { i = i, cg = cg, v = { F(w, "FreeVal0"), F(w, "FreeVal1"), F(w, "FreeVal2"), F(w, "FreeVal3"), F(w, "FreeVal4"), F(w, "FreeVal5") },
        acc = arr_vals(F(w, "EquipmentAccessoryIdArray")), bc = F(w, "BonusByCreating"), bg = F(w, "BonusByGrinding"), gn = F(w, "GrindingNum") })
    end
  end
  -- loadouts
  local ms = F(eq, "_EquipMySet")
  n = 0
  pcall(function() n = ms:get_size() end)
  for i = 0, n - 1 do
    local m = ms:get_element(i)
    local p = F(m, "_MysetParam")
    local empty = p and F(p, "IsEmpty") or 1
    if empty == 0 then
      local lo = { slot = i, name = p and tostring(F(p, "MysetName") or "") or "", index = arr_vals(F(F(p, "_EquipIndex"), "Index")), pieces = {} }
      local works = F(m, "_MysetEquipWork")
      local k = 0
      pcall(function() k = works:get_size() end)
      for j = 0, k - 1 do
        local w = works:get_element(j)
        table.insert(lo.pieces, { c = F(w, "Category"), v0 = F(w, "FreeVal0"), v1 = F(w, "FreeVal1"), none = F(w, "IsNone"),
          acc = arr_vals(F(w, "EquipmentAccessoryIdArray")) })
      end
      table.insert(out.loadouts, lo)
    end
  end
  -- what you're wearing now
  out.current = arr_vals(F(F(eq, "_EquipIndex"), "Index"))
  -- decorations owned
  local ab = F(eq, "_AccessoryBox")
  n = 0
  pcall(function() n = ab:get_size() end)
  for i = 0, n - 1 do
    local a = ab:get_element(i)
    local id, num = F(a, "ID"), F(a, "Num")
    if id ~= nil and id >= 0 and num and num > 0 then table.insert(out.accessories, { id = id, n = num }) end
  end
  if #out.box == 0 and #out.loadouts == 0 then
    -- don't overwrite a good export with an empty one (title screen, loading)
    gear_status = "waiting for a save to load"
    return false
  end
  json.dump_file(OUT_SAVE, out)
  gear_status = string.format("exported %d loadouts, %d gear pieces at %s", #out.loadouts, #out.box, out.time)
  return true
end

-- Auto export: wait until a save is actually loaded (you're wearing gear), export,
-- then export again whenever your equipped gear, loadouts or box size change.
-- Checks are cheap (a few numbers every 5 s) and exports are at least 15 s apart.
local gear_tick, gear_last_export, gear_sig, gear_box_tick, gear_box_n = 0, -100, nil, -100, -1
local function cur_index(eq)
  local idx = arr_vals(F(F(eq, "_EquipIndex"), "Index"))
  local any = false
  for _, v in ipairs(idx) do if v ~= nil and v >= 0 then any = true; break end end
  return any, table.concat(idx, ",")
end
local function myset_sig(eq)
  local ms = F(eq, "_EquipMySet")
  local n, used = 0, {}
  pcall(function() n = ms:get_size() end)
  for i = 0, n - 1 do
    local p = F(ms:get_element(i), "_MysetParam")
    if p and F(p, "IsEmpty") == 0 then used[#used + 1] = i .. ":" .. tostring(F(p, "MysetName") or "") end
  end
  return table.concat(used, "|")
end
local function box_count(eq)
  local box = F(eq, "_EquipBox")
  local n, c = 0, 0
  pcall(function() n = box:get_size() end)
  for i = 0, n - 1 do
    local cg = F(box:get_element(i), "Category_Gender")
    if cg ~= nil and (cg >> 3) <= 4 then c = c + 1 end
  end
  return c
end
re.on_frame(function()
  if not auto_gear then return end
  local now = os.clock()
  if now - gear_tick < 5 then return end
  gear_tick = now
  local ok, eq = pcall(equip_root_early)
  if not ok or eq == nil then return end
  local okI, loaded, idx = pcall(cur_index, eq)
  if not okI or not loaded then
    -- title screen or no save yet; forget the old signature so the next load exports
    gear_sig, gear_box_n = nil, -1
    if gear_status:sub(1, 8) ~= "exported" then gear_status = "waiting for a save to load" end
    return
  end
  -- box count is the heavier check, so only every 60 s
  if now - gear_box_tick > 60 or gear_box_n < 0 then
    gear_box_tick = now
    local okB, c = pcall(box_count, eq)
    if okB then gear_box_n = c end
  end
  local okM, ms = pcall(myset_sig, eq)
  local sig = idx .. "#" .. (okM and ms or "") .. "#" .. gear_box_n
  if sig == gear_sig or now - gear_last_export < 15 then return end
  if gear_box_n <= 0 then return end
  local ok2, res = pcall(export_gear)
  gear_last_export = now
  if not ok2 then gear_status = "export failed: " .. tostring(res)
  elseif res then gear_sig = sig end
end)

-- ---------- write a loadout sent from the app ----------
-- Only ever writes into an EMPTY loadout slot, only when you click the button,
-- and keeps an undo copy of the slot.
local REQ_FILE, APPLIED_FILE, UNDO_FILE = "questmaker/loadout_request.json", "questmaker/loadout_applied.json", "questmaker/loadout_undo.json"
local lo_req, lo_applied, lo_checked, lo_status, lo_undo = nil, nil, -100, "", nil

local function arr_set(a, i, v, size)
  -- write one element of a primitive array (Int16[] / Int32[]) and check it stuck
  local function ok_now() local okr, e = pcall(function() return a:get_element(i) end); return okr and val(e) == v end
  if size == 2 then pcall(function() a:write_short(0x20 + i * 2, v) end) else pcall(function() a:write_dword(0x20 + i * 4, v) end) end
  if ok_now() then return true end
  pcall(function() a:call("SetValue(System.Object, System.Int32)", sdk.create_int32(v), i) end)
  return ok_now()
end

local function snapshot_slot(m)
  local p = F(m, "_MysetParam")
  local snap = { name = tostring(F(p, "MysetName") or ""), isEmpty = F(p, "IsEmpty"), index = arr_vals(F(F(p, "_EquipIndex"), "Index")), works = {} }
  local works = F(m, "_MysetEquipWork")
  for j = 0, works:get_size() - 1 do
    local w = works:get_element(j)
    table.insert(snap.works, { c = F(w, "Category"), v0 = F(w, "FreeVal0"), v1 = F(w, "FreeVal1"), none = F(w, "IsNone"), g = F(w, "GenderType"), acc = arr_vals(F(w, "EquipmentAccessoryIdArray")) })
  end
  return snap
end

local function apply_slot(m, snap)
  local p = F(m, "_MysetParam")
  local ok = true
  p:set_field("MysetName", sdk.create_managed_string(snap.name))
  local idx = F(F(p, "_EquipIndex"), "Index")
  for k, v in ipairs(snap.index) do ok = arr_set(idx, k - 1, v, 4) and ok end
  local works = F(m, "_MysetEquipWork")
  for j, s in ipairs(snap.works) do
    local w = works:get_element(j - 1)
    w:set_field("Category", s.c); w:set_field("FreeVal0", s.v0); w:set_field("FreeVal1", s.v1)
    w:set_field("IsNone", s.none); w:set_field("GenderType", s.g)
    local acc = F(w, "EquipmentAccessoryIdArray")
    for a, v in ipairs(s.acc) do ok = arr_set(acc, a - 1, v, 2) and ok end
  end
  p:set_field("IsEmpty", snap.isEmpty)
  return ok
end

local function equip_root()
  local mgr = sdk.get_managed_singleton("app.SaveDataManager")
  local save = mgr and mgr:call("getCurrentUserSaveData")
  return save and F(save, "_Equip")
end

local function write_loadout()
  local eq = equip_root()
  if eq == nil then lo_status = "Load your save first."; return end
  local ms, box = F(eq, "_EquipMySet"), F(eq, "_EquipBox")
  local slot = nil
  for i = 0, ms:get_size() - 1 do
    local p = F(ms:get_element(i), "_MysetParam")
    if p and F(p, "IsEmpty") ~= 0 then slot = i; break end
  end
  if slot == nil then lo_status = "No empty loadout slot. Free one up in the game first."; return end
  local m = ms:get_element(slot)
  local before = snapshot_slot(m)
  -- start from what you're wearing now, then put the build's pieces on top
  local cur = arr_vals(F(F(eq, "_EquipIndex"), "Index"))
  local snap = { name = lo_req.name, isEmpty = 0, index = {}, works = {} }
  for k = 1, #before.index do snap.index[k] = cur[k] or -1 end
  for j = 1, #before.works do
    local bi = cur[j] or -1
    local s = { c = -1, v0 = 0, v1 = 0, none = 1, g = before.works[j].g or -1, acc = { -1, -1, -1 } }
    if bi >= 0 and j <= 9 then
      local w = box:get_element(bi)
      local cg = F(w, "Category_Gender")
      if cg and (cg >> 3) <= 4 then
        s.c, s.v0, s.v1, s.none = cg >> 3, F(w, "FreeVal0"), F(w, "FreeVal1"), 0
        s.g = (s.c == 0) and (cg & 7) or -1
        s.acc = arr_vals(F(w, "EquipmentAccessoryIdArray"))
      end
    end
    snap.works[j] = s
  end
  for _, pc in ipairs(lo_req.pieces) do
    local j = pc.equip + 1
    snap.index[j] = pc.box
    snap.works[j] = { c = pc.cat, v0 = pc.v0, v1 = pc.v1, none = 0, g = pc.gender, acc = pc.acc }
  end
  local ok, res = pcall(apply_slot, m, snap)
  if not ok or not res then
    pcall(apply_slot, m, before)
    lo_status = "Couldn't write the loadout (nothing was changed): " .. tostring(res)
    return
  end
  json.dump_file(UNDO_FILE, { slot = slot, before = before, id = lo_req.id })
  lo_applied = { id = lo_req.id, slot = slot, name = lo_req.name, time = os.date("%Y-%m-%d %H:%M:%S") }
  json.dump_file(APPLIED_FILE, lo_applied)
  lo_status = string.format("Wrote \"%s\" to loadout slot %d. Open your loadouts in the game to equip it.", lo_req.name, slot + 1)
  pcall(export_gear)
end

local function undo_loadout()
  local u = json.load_file(UNDO_FILE)
  local eq = equip_root()
  if u == nil or eq == nil then lo_status = "Nothing to undo."; return end
  local m = F(eq, "_EquipMySet"):get_element(u.slot)
  local ok, res = pcall(apply_slot, m, u.before)
  if ok and res then
    lo_status = string.format("Loadout slot %d restored.", u.slot + 1)
    json.dump_file(UNDO_FILE, { done = true })
    pcall(export_gear)
  else
    lo_status = "Undo failed: " .. tostring(res)
  end
end

re.on_draw_ui(function()
  if os.clock() - lo_checked > 3 then
    lo_checked = os.clock()
    lo_req = json.load_file(REQ_FILE)
    if lo_req then lo_applied = json.load_file(APPLIED_FILE) end
    lo_undo = json.load_file(UNDO_FILE)
  end
  if lo_req and lo_req.id and not (lo_applied and lo_applied.id == lo_req.id) then
    imgui.text_colored(string.format("MH Wilds Tools: loadout waiting: \"%s\"", tostring(lo_req.name)), 0xFF3AC4E0)
    if imgui.button("Write to empty loadout slot") then
      local ok, err = pcall(write_loadout)
      if not ok then lo_status = "Error: " .. tostring(err) end
    end
    imgui.same_line()
    if imgui.button("Dismiss") then
      lo_applied = { id = lo_req.id, dismissed = true }
      json.dump_file(APPLIED_FILE, lo_applied)
    end
  end
  if lo_status ~= "" then imgui.text(lo_status) end
end)

re.on_draw_ui(function()
  if imgui.tree_node("MH Wilds Tools data reader") then
    imgui.text("Gear export: " .. gear_status)
    if imgui.button("Export my gear now") then
      local ok, err = pcall(export_gear)
      if not ok then gear_status = "export failed: " .. tostring(err) end
    end
    imgui.same_line()
    local ch, v = imgui.checkbox("Auto export when gear changes", auto_gear)
    if ch then auto_gear = v end
    local u = lo_undo
    if u and u.slot and not u.done then
      if imgui.button(string.format("Undo last loadout write (slot %d)", u.slot + 1)) then
        local ok, err = pcall(undo_loadout)
        if not ok then lo_status = "Undo error: " .. tostring(err) end
      end
    end
    imgui.tree_pop()
  end
end)

-- ---------- hunt log ----------
-- Records each large monster you fight: when you first damage it, when it's slain or
-- captured, the weapon you used and your gear. Read-only. Saved to questmaker/hunts.json.
local OUT_HUNTS, OUT_HDBG = "questmaker/hunts.json", "questmaker/hunt_debug.json"
local hunts = {}
pcall(function() local old = json.load_file(OUT_HUNTS); if old and old.hunts then hunts = old.hunts end end)
local live = {}          -- address -> { ctx, entry, started, max, last_hp, last_seen }
local hunt_status = string.format("%d hunts logged", #hunts)
local quest = { active = false, since = nil, id = nil, method = nil }

local function save_hunts()
  while #hunts > 1000 do table.remove(hunts, 1) end
  pcall(json.dump_file, OUT_HUNTS, { tool = "MH Wilds Tools", version = VERSION, hunts = hunts })
  hunt_status = string.format("%d hunts logged", #hunts)
end

local function current_gear()
  local g = {}
  pcall(function()
    local mgr = sdk.get_managed_singleton("app.SaveDataManager")
    local save = mgr:call("getCurrentUserSaveData")
    local eq = save:get_field("_Equip")
    local idx = arr_vals(eq:get_field("_EquipIndex"):get_field("Index"))
    g.index = idx
    local box = eq:get_field("_EquipBox")
    local w = box:get_element(idx[1])
    g.wtype = w:get_field("FreeVal0"); g.weapon = w:get_field("FreeVal1")
  end)
  return g
end

-- quest state: tries a few likely method names and remembers which one works
local QUEST_TRIES = {
  { "app.MissionManager", "get_IsActiveQuest" }, { "app.MissionManager", "isActiveQuest" },
  { "app.MissionManager", "get_IsPlayingQuest" }, { "app.MissionManager", "isPlayingQuest" },
  { "app.MissionManager", "get_IsQuestPlaying" }, { "app.MissionManager", "IsActiveQuest" },
}
local QUEST_ID_TRIES = { "get_ActiveQuestId", "getActiveQuestId", "get_QuestID", "get_ActiveMissionId" }
local hdbg, hdbg_saved = { tries = {} }, false
local function quest_active()
  if quest.method then
    local ok, v = pcall(function() return sdk.get_managed_singleton(quest.method[1]):call(quest.method[2]) end)
    if ok and type(v) == "boolean" then return v end
    return nil
  end
  if quest.gave_up or os.clock() - (quest.last_try or -100) < 15 then return nil end
  quest.last_try = os.clock(); quest.tries = (quest.tries or 0) + 1
  if quest.tries > 20 then quest.gave_up = true end
  for _, t in ipairs(QUEST_TRIES) do
    local ok, v = pcall(function() return sdk.get_managed_singleton(t[1]):call(t[2]) end)
    hdbg.tries[t[1] .. ":" .. t[2]] = ok and tostring(v) or "error"
    if ok and type(v) == "boolean" then quest.method = t; hdbg.found = t[1] .. ":" .. t[2]; return v end
  end
  if not hdbg_saved then
    hdbg_saved = true
    pcall(function()
      local td = sdk.find_type_definition("app.MissionManager")
      hdbg.methods = {}
      for _, m in ipairs(td:get_methods()) do
        local n = m:get_name()
        if n:find("Quest") or n:find("Mission") then table.insert(hdbg.methods, n) end
      end
    end)
    pcall(json.dump_file, OUT_HDBG, hdbg)
  end
  return nil
end
local function quest_id()
  local mm = sdk.get_managed_singleton("app.MissionManager")
  for _, m in ipairs(QUEST_ID_TRIES) do
    local ok, v = pcall(function() return mm:call(m) end)
    if ok and v ~= nil and type(v) ~= "userdata" then return v end
  end
  return nil
end

local CAPTURE_TRIES = { "get_IsCapture", "get_IsCaptured", "isCapture", "get_IsCaptureEnd" }
local capture_method = nil
local finished = {}  -- monsters already logged this area (a captured monster stays around and shouldn't be logged twice)
local function finish(addr, how)
  local h = live[addr]; if not h then return end
  live[addr] = nil
  finished[addr] = true
  local e = h.entry
  if os.clock() - h.started < 3 or (how == "quest ended" and os.clock() - h.started < 5) then pcall(function() h.ctx:release() end); return end
  e.result = how
  e.seconds = math.floor((os.clock() - h.started) * 10 + 0.5) / 10
  e.ended = os.date("%Y-%m-%d %H:%M:%S")
  e.hp_left = h.last_hp
  table.insert(hunts, e)
  save_hunts()
  pcall(function() h.ctx:release() end)
end

local checked, checked_reset = {}, 0
local function track(ctx, addr, now)
  local h = live[addr]
  if h then h.last_seen = now; return end
  if finished[addr] then return end
  if not ctx:call("get_IsBoss") then return end
  local hm = nil
  pcall(function() hm = ctx:call("get_Browser"):get_field("_Context"):call("get_Chara"):call("get_HealthManager") end)
  if not hm then return end
  local maxhp = hm:call("get_MaxHealth"); local hp = hm:call("get_Health")
  if not maxhp or maxhp <= 0 or not hp or hp >= maxhp or hp <= 0 then return end  -- not engaged yet, or already down
  local em, leg = ctx:call("get_EmID"), ctx:call("get_LegendaryID")
  local name = nil
  pcall(function() name = sdk.find_type_definition("app.EnemyDef"):get_method("NameString"):call(nil, em, ctx:call("get_RoleID"), leg) end)
  local entry = { name = name, em_id = em, legendary = leg, max_health = maxhp, started = os.date("%Y-%m-%d %H:%M:%S"),
                  in_quest = quest.active or false, quest_id = quest.id, gear = current_gear() }
  pcall(function() entry.rank_guid = read_guid(ctx, ctx:get_type_definition():get_field("_DifficultyRankId"):get_offset_from_base()) end)
  pcall(function() entry.players = ctx:get_field("PlayerCountWhenApplyDifficulty") end)
  pcall(function() ctx:add_ref() end)
  live[addr] = { ctx = ctx, hm = hm, entry = entry, started = os.clock(), max = maxhp, last_hp = hp, last_seen = os.clock() }
  hunt_status = string.format("fighting %s", name or "a monster")
end

if get_is_angry then
  sdk.hook(get_is_angry, function(args)
    -- this runs very often, so do almost nothing unless it's time to look at this enemy
    local addr = sdk.to_int64(args[2])
    local now = os.clock()
    local h = live[addr]
    if h then h.last_seen = now; return end
    local c = checked[addr]
    if c and now - c < 2 then return end
    checked[addr] = now
    pcall(function() track(sdk.to_managed_object(args[2]), addr, now) end)
  end, function(r) return r end)
end

local last_tick = 0
re.on_frame(function()
  local now = os.clock()
  if now - last_tick < 1 then return end
  last_tick = now
  if now - checked_reset > 60 then checked = {}; checked_reset = now end
  local qa = quest_active()
  if qa ~= nil and qa ~= quest.active then
    quest.active = qa
    if qa then finished = {} end
    if qa then quest.since = now; quest.id = quest_id() else
      -- quest ended: anything still alive was abandoned or the quest failed
      for addr, _ in pairs(live) do finish(addr, "quest ended") end
      quest.id = nil
    end
  end
  for addr, h in pairs(live) do
    local ok, hp = pcall(function() return h.hm:call("get_Health") end)
    if ok and hp then
      h.last_hp = hp
      if hp <= 0 then finish(addr, "slain") end
    end
    if live[addr] then
      local cap = false
      for _, m in ipairs(capture_method and { capture_method } or CAPTURE_TRIES) do
        local ok2, v = pcall(function() return h.ctx:call(m) end)
        if ok2 and type(v) == "boolean" then capture_method = m; if v then cap = true end; break end
      end
      if cap then finish(addr, "captured")
      elseif now - h.last_seen > 20 then
        finish(addr, (h.last_hp or 1) <= h.max * 0.3 and "captured or left" or "left")
      end
    end
  end
end)

re.on_draw_ui(function()
  if imgui.tree_node("MH Wilds Tools hunt log") then
    imgui.text(hunt_status)
    imgui.text("Quest detection: " .. (quest.method and "working" or "not found yet (monster-based log still works)"))
    imgui.tree_pop()
  end
end)
