# MH Wilds Tools

A Windows app for Monster Hunter Wilds. It has four parts:

- Quests: make custom event quests (monster, star rating, normal / tempered / arch-tempered, rewards) and install them in one click.
- Builds: a build editor and a calculator that finds gear for the skills you want, in the order you want them. It can also import your in-game loadouts and send builds back to the game, and compare builds' damage against any monster.
- Monsters: a guide for every large monster (weak spots, best element, what it attacks with, hitzones, drops) that can also find the best builds against it.
- Hunts: a log of the monsters you fight, with personal bests.

Monster health for every quest strength is built in. The small data reader script is only needed for loadouts, sending builds to the game and the hunt log.

## Download

[MHWildsQuestMaker.exe](https://github.com/waycaar/mhwilds-tools/raw/main/releases/MHWildsQuestMaker.exe)

Put it in its own folder and run it. The first time, Windows might say "Windows protected your PC". Click More info, then Run anyway. After that the app keeps itself up to date.

## You'll need

- [REFramework](https://github.com/praydog/REFramework)
- The Permanent Event Quest mod, for custom quests

## Changes

See [CHANGELOG.md](CHANGELOG.md).

## Credits

Made by waycock (Discord: waycock).

Gear and monster data from [mhdb-wilds-data](https://github.com/LartTyler/mhdb-wilds-data) (GPL-3.0). Runs on [REFramework](https://github.com/praydog/REFramework). Uses the [Inter](https://rsms.me/inter/) typeface (SIL Open Font License). Monster Hunter Wilds is a trademark of Capcom. This is a fan-made tool and isn't affiliated with Capcom.
