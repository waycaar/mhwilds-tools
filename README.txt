===============================================================================
  MH WILDS TOOLS
  Custom quests, build planning, monster guides and a hunt log
  for Monster Hunter Wilds on PC
===============================================================================

  Made by waycock  (Discord: waycock)
  Download and updates: https://github.com/waycaar/mhwilds-tools


-------------------------------------------------------------------------------
 CONTENTS
-------------------------------------------------------------------------------
  1. What it does
  2. What you need
  3. Install
  4. Updating
  5. How to use it
  6. Troubleshooting
  7. Privacy and files
  8. Uninstall
  9. Credits and thanks


-------------------------------------------------------------------------------
 1. WHAT IT DOES
-------------------------------------------------------------------------------
  Quests    Make your own event quests: up to five monsters, normal, tempered
            or arch-tempered, any star rating and strength, size, time limit
            and rewards. Installs in one click.

  Builds    A build editor, a calculator that finds gear for the skills you
            want in priority order, and a damage tab to compare builds
            against any monster. Imports your gear from the game and can send
            a build back into an empty loadout slot.

  Monsters  A guide for every large monster: where to hit, best damage type,
            element and statuses, what it attacks with, items that work,
            hitzones and drops. It can also find the best builds against it.

  Hunts     A log of every large monster you fight, with times, personal
            bests and the gear you used.

  Monster health for every quest strength is built into the app. The game
  script that comes with it is small and only reads what it needs for
  loadouts and the hunt log.


-------------------------------------------------------------------------------
 2. WHAT YOU NEED
-------------------------------------------------------------------------------
  - Windows 10 or 11 and Monster Hunter Wilds on PC
  - REFramework
      https://github.com/praydog/REFramework/releases
      Needed for custom quests, gear import, sending builds and the hunt log.
  - Permanent Event Quests and Custom Quest Loader, by kassent
      https://www.nexusmods.com/monsterhunterwilds/mods/1096
      Needed for custom quests.

  The build editor, calculator and monster guide work without any mods.


-------------------------------------------------------------------------------
 3. INSTALL
-------------------------------------------------------------------------------
  1) Install REFramework.
     Download the Monster Hunter Wilds build from the REFramework releases
     page and put dinput8.dll in your game folder, next to
     MonsterHunterWilds.exe. Start the game once. Pressing Insert should open
     the REFramework menu.

  2) Install the Permanent Event Quest mod (only for custom quests).
     Follow the instructions on its Nexus page.

  3) Put MHWildsQuestMaker.exe in its own folder,
     for example Documents\MH Wilds Tools. It's a single file and doesn't
     need installing.

  4) Run it.
     The first time, Windows may show "Windows protected your PC".
     Click "More info", then "Run anyway". This only happens once, because
     the app isn't signed with a paid certificate.

  5) Check the game folder.
     The app looks for your Steam game folder by itself. If the dot next to
     Settings is red, open Settings > Game folder > Change and pick the
     folder that contains MonsterHunterWilds.exe.

  6) Install the data reader (optional).
     Open the Updates tab and click Install. It adds one script,
     questmaker_reader.lua, to reframework\autorun. Restart the game
     afterwards. You only need it for gear import, sending builds to the
     game and the hunt log.


-------------------------------------------------------------------------------
 4. UPDATING
-------------------------------------------------------------------------------
  The app checks for new versions when it starts and asks before installing.
  You can also check from the Updates tab, or turn the check off in Settings.
  If the Updates tab says the data reader is out of date, click Update and
  restart the game.


-------------------------------------------------------------------------------
 5. HOW TO USE IT
-------------------------------------------------------------------------------
  MAKE A CUSTOM QUEST
    1) Open the Quests tab and click "+ New quest".
    2) Fill in the name, client and description. Long lines are wrapped to
       fit the quest board for you.
    3) Pick the map, objective (hunt, slay or capture), star rating, time
       limit, faints and player count.
    4) Add up to five monsters. For each one choose normal, tempered or
       arch-tempered (only offered for monsters that come that way), the
       strength (sets health and damage) and the size.
    5) Add rewards if you like.
    6) Fix anything listed at the bottom of the window, then click
       "Create & install".
    7) In the game, restart, or press Insert > Script Generated UI >
       Permanent Event Quest > Reload. The quest is on the quest board under
       Event Quests.

    Your quests are listed on the left. Click one to edit it, or use the X
    to remove it.

  PLAN A BUILD
    Editor      Click a slot to choose a weapon, armor or talisman, and click
                a slot circle to add a decoration. Tick "Only gear I own" to
                list only what's in your last gear export.
    Calculator  Add the skills you want, top one first. It maxes the first
                skill, then fits the next as far as possible, and so on.
                Longer search times check more combinations and can show up
                to 100 results. Click a result to open it in the editor.
    Damage      Compare saved builds' damage per hit on every part of a
                monster.
    Hunted      Mark which monsters you've hunted (normal, tempered,
    monsters    arch-tempered) and the calculator can skip gear you can't
                craft yet.

  IMPORT YOUR GEAR AND SEND BUILDS TO THE GAME  (needs the data reader)
    1) Start the game and load your save. Your gear is exported
       automatically a few seconds after you load in, and again whenever
       your gear or loadouts change.
    2) In the Builds tab, click "Import from game" to load your loadouts.
    3) To send a build, open it in the editor and click "Send to game".
       In the game, press Insert and click "Write to empty loadout slot".
       It only ever uses an empty slot, the app backs up your save first
       when it can, and you can undo it from the same menu.

  MONSTER GUIDE
    Pick a monster on the left. Monsters and Guardian monsters are listed
    separately. The page shows where to hit with each damage type, weak
    points, element and status ratings, what it attacks with and what works
    on it. "Find best builds" ranks builds against that monster, optionally
    limited to gear you own or can craft, with Artian weapons included.

  HUNT LOG  (needs the data reader)
    Every large monster you fight is logged from your first hit until it's
    slain or captured. The Hunts tab shows your times, personal bests and
    the weapon you used. Each monster's page shows how many times you've
    hunted it and your best time.


-------------------------------------------------------------------------------
 6. TROUBLESHOOTING
-------------------------------------------------------------------------------
  "Windows protected your PC"
    Click More info > Run anyway. It only shows on the first run.

  The game folder isn't found
    Settings > Game folder > Change, and pick the folder with
    MonsterHunterWilds.exe.

  The quest doesn't show up in the game
    Check the Permanent Event Quest mod is installed (the app warns you if
    it isn't), then restart the game or use Reload in the REFramework menu.

  Import from game finds no gear
    Load into your save and wait a few seconds. Or press Insert >
    MH Wilds Tools data reader > Export my gear now.

  Send to game says there's no empty slot
    Free up a loadout slot in the game first. The app never overwrites one
    of yours.

  The Hunts tab is missing
    It hides itself until the data reader is installed. You can force it on
    in Settings > Tabs.

  The window opens in a web browser
    Install the Microsoft Edge WebView2 Runtime from Microsoft. It's already
    on most Windows 10 and 11 PCs.


-------------------------------------------------------------------------------
 7. PRIVACY AND FILES
-------------------------------------------------------------------------------
  - The app runs locally. Its only network request is the update check
    against the GitHub page above, which you can turn off in Settings.
  - Settings, saved builds and hunted monsters are kept in
    %APPDATA%\MHWildsQuestMaker
  - In your game folder it only writes:
      reframework\plugins\PermanentEventQuest\quests   (your quests)
      reframework\autorun\questmaker_reader.lua         (the data reader)
      reframework\data\questmaker                       (the reader's files)
  - The data reader reads your equipment, loadouts and the monsters you
    fight. It writes your save only when you click
    "Write to empty loadout slot".


-------------------------------------------------------------------------------
 8. UNINSTALL
-------------------------------------------------------------------------------
  Delete:
    - the folder you put the app in
    - %APPDATA%\MHWildsQuestMaker
    - reframework\autorun\questmaker_reader.lua  (in your game folder)
    - reframework\data\questmaker                (in your game folder)


-------------------------------------------------------------------------------
 9. CREDITS AND THANKS
-------------------------------------------------------------------------------
  Made by waycock. Questions, bug reports and ideas are welcome on
  Discord: waycock

  Thanks to the people whose work this is built on:

  LartTyler
    mhdb-wilds-data: the gear, skill and monster data behind the builds and
    the monster guide (GPL-3.0)
    https://github.com/LartTyler/mhdb-wilds-data

  praydog and the REFramework contributors
    REFramework, which runs the data reader and makes Wilds modding possible
    https://github.com/praydog/REFramework

  kassent
    Permanent Event Quests and Custom Quest Loader, which loads the quests
    this app makes
    https://www.nexusmods.com/monsterhunterwilds/mods/1096

  Rasmus Andersson
    The Inter typeface used in the app (SIL Open Font License)
    https://rsms.me/inter/

  Everyone who tested early builds, for the bug reports and screenshots.

  Monster Hunter Wilds is a trademark of Capcom. MH Wilds Tools is a
  fan-made project and isn't affiliated with or endorsed by Capcom.
