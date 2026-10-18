# Building MH Wilds Tools

MH Wilds Tools is a single Go program. The web interface (`web/`), the data reader script (`lua/`) and the game data (`data/`) are embedded into the .exe when you build it.

## Requirements

- Go 1.24 or newer: https://go.dev/dl/
- Internet access the first time, so Go can download the two dependencies listed in `go.mod` (go-webview2 and golang.org/x/sys)

No C compiler is needed.

## Build the Windows app

From this folder, on Windows (PowerShell):

```
$env:GOOS="windows"; $env:GOARCH="amd64"; $env:CGO_ENABLED="0"
go build -trimpath -ldflags "-H windowsgui -s -w -X main.appVersion=1.5.1 -X main.versionTag=QMVER:1.5.1" -o MHWildsTools.exe .
```

Or from Linux or macOS:

```
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-H windowsgui -s -w -X main.appVersion=1.5.1 -X main.versionTag=QMVER:1.5.1" -o MHWildsTools.exe .
```

- `-H windowsgui` stops a console window from opening next to the app.
- `appVersion` is the version shown in the app. `versionTag` lets the updater read the version from the file.
- `rsrc_windows_amd64.syso` holds the app icon and the Windows manifest and is picked up by `go build` automatically. To regenerate it from `icon.ico` and `app.manifest`:
  `go run github.com/akavel/rsrc@latest -manifest app.manifest -ico icon.ico -arch amd64 -o rsrc_windows_amd64.syso`

## Run the tests

```
go test ./...
```

The quest builder test needs the official quest files from the Permanent Event Quest mod. Copy `reframework\plugins\PermanentEventQuest\quests` from your game folder into `testdata/peq/quests`. Without them that test is skipped. They aren't included here because they come with that mod.

## Try it in a browser

`go run . -serve 127.0.0.1:8765` starts only the local server and prints a link with a one-time token. This works on any OS, which is handy for working on the interface.

## Where things are

| Path | What it is |
|---|---|
| `main.go`, `server.go` | Startup and the local server the interface talks to |
| `generator.go`, `install.go` | Building quest files and installing them |
| `calc.go` | The build calculator |
| `github.go`, `update.go` | Checking for updates and installing them |
| `hp.go`, `sendgame.go` | Data reader install, gear import and sending builds to the game |
| `ui_windows.go` | The WebView2 window |
| `web/` | The interface (HTML, CSS and JavaScript) |
| `lua/questmaker_reader.lua` | The REFramework data reader script |
| `data/` | Game data: gear and monsters (from mhdb-wilds-data), quest options, monster strength tables |
