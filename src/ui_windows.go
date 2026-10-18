//go:build windows

package main

import (
	"os/exec"
	"path/filepath"
	"syscall"
	"unsafe"

	webview2 "github.com/jchv/go-webview2"
)

func messageBox(title, text string) {
	u := syscall.NewLazyDLL("user32.dll").NewProc("MessageBoxW")
	t, _ := syscall.UTF16PtrFromString(title)
	m, _ := syscall.UTF16PtrFromString(text)
	u.Call(0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), 0x40)
}

func notify(title, text string) { messageBox(title, text) }

func runUI(url string) {
	w := webview2.NewWithOptions(webview2.WebViewOptions{
		AutoFocus: true,
		DataPath:  filepath.Join(appDir(), "webview"),
		WindowOptions: webview2.WindowOptions{
			Title:  "MH Wilds Tools",
			Width:  1280,
			Height: 860,
			IconId: 1,
			Center: true,
		},
	})
	if w == nil {
		// No WebView2 runtime: fall back to the default browser.
		exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
		messageBox("MH Wilds Tools",
			"MH Wilds Tools opened in your web browser because the Microsoft Edge WebView2 runtime wasn't found.\n\nKeep this box open while you use it. Click OK to quit.")
		return
	}
	defer w.Destroy()
	w.Navigate(url)
	w.Run()
}
