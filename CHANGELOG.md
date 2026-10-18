# Changelog

## 1.5 (2026-10-18)
- The app file is now MHWildsTools.exe. Updating from an older version renames it for you and removes the old MHWildsQuestMaker.exe, so update any shortcut you made. Your settings and builds stay where they are
- Credits thank the people the app is built on by name: LartTyler, praydog and the REFramework contributors, kassent and Rasmus Andersson
- No more white box around a tab after you click it
- New README with a full setup and usage guide, plus README.txt with the same guide for offline reading
- Small text fixes

## 1.4.12 (2026-10-18)
Rolls up the 1.4.2 to 1.4.11 testing builds.

New
- The app is now called MH Wilds Tools, with a new look: new typeface, frosted header, softer cards and buttons. Works with every theme
- Credits page (star button in the top bar)
- Settings (gear icon): game folder, theme, text size, higher contrast, reduce motion, which tabs show, update checks
- Builds editor: "Only gear I own" checkbox, so the pickers only list what's in your gear export
- Calculator: choose how long to search, from 3 seconds to a minute. Longer searches can find better builds and show up to 100 results
- Monsters: damage type ratings (cutting, blunt, shot), weaknesses as compact rows, the list split into Monsters and Guardian monsters
- Monster pages: hunted / tempered / arch-tempered toggles, hunts logged and best times from your hunt log

Quests
- Health and attack for every strength level are built into the app, read from the game's own table, so HP shows without the data reader
- Arch-Tempered is only offered for the monsters that come that way (Rey Dau, Uth Duna, Nu Udra, Jin Dahaad, Arkveld)
- Fewer warnings. The only one left is for a monster on a map it has never officially appeared on
- Fixed: "+ Add monster" did nothing

Data reader (v9)
- Much smaller. It only handles your gear, sending builds to the game and the hunt log, and does far less work while you play
- Exports your gear automatically once your save loads, and again when your gear or loadouts change
- Fixed hunts being logged more than once after a capture or kill
- The old developer probe is removed from your game folder automatically

## 1.4.1 (2026-10-16)
- Best builds against a monster can now include Artian weapons with perfect rolls (checkbox). It picks the element, the attack/affinity parts and the five reinforcement rolls that hit that monster hardest with your skills, and shows them so you know what to craft
- Planned Artian builds open in the editor

## 1.4 (2026-10-16)
Rolls up the 1.3.1 to 1.3.7 testing builds.
- Monsters tab: a guide per monster with where to hit, best element and statuses, what it attacks with, items that work, hitzones and drops
- Best builds against a monster, ranked by damage on that monster, with resistance to its attacks
- Hunts tab: a log of every large monster you fight, with personal bests
- Damage tab in Builds: compare builds' damage per hit on every part
- Hunted monsters: the calculator can skip gear you can't craft yet (normal, tempered, arch-tempered)
- Calculator results styled like the in-game skill list, gamma armor option, clear build button
- Search ignores apostrophes and understands γ / gamma / y and III / 3
- Small windows work: tabs scroll, layouts stack
- Data reader v7 records hunts

## 1.3 (2026-10-16)
First public release. Rolls up everything from 1.2.1 to 1.2.6.
- The app now updates itself from this repo. Open the Updates tab, or just start the app and it'll ask.
- Updates no longer trigger the Windows "protected your PC" screen. You only see it on the first install.

## 1.2.6
- Checks GitHub for new versions and installs them from inside the app
- "Check again" button in the Updates tab

## 1.2.5
- Icons for every weapon type, armor piece and talisman, colored by rarity
- Decorations show as colored gems, shaped by slot size
- New calculator layout. Each result lists the weapon, head to legs, then the talisman, with every slot and what's in it
- Icons are part of the app, nothing gets downloaded

## 1.2.4
- Calculator: must-have skills, lock pieces from the editor, ban pieces from results
- "Room for more" suggestions for skills that still fit in your free slots
- Faster search, better builds show up sooner
- Updates still install if your browser renames the file
- Data reader v6: starts reading Artian bonuses and random talisman skills

## 1.2.3
- Build calculator. List skills in the order you care about and it maxes the first one, then the next, and so on
- Send to game: writes a build into an empty loadout slot. Your save gets backed up first and there's an undo
- Data reader v5

## 1.2.2
- Import your in-game loadouts and current gear as builds
- Updates tab installs waiting updates automatically
- Data reader v4: exports gear, loadouts and decorations

## 1.2.1
- Version number in the bottom-right corner
- Updates install themselves and old copies get cleaned up
- Added the Updates tab
- First step of importing gear from the game

## 1.2
- Builds tab: weapons, armor, talismans, decorations, skill totals, set bonuses and shareable build codes
- Themes, with two colors you can change
- Search quests by name, monster, ID or map
- Monster health updates when you change the strength setting

## 1.1.1
- Monster icons in the list and on the quest, plus drag-and-drop for your own pictures
- All 773 Wilds items available as rewards
- Monster health pulled from game data
- Restart button

## 1.0
- First version. Create, edit and install event quests
