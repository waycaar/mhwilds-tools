//go:build !windows

package main

import "log"

func runUI(url string) {
	log.Printf("open %s in a browser", url)
	select {}
}

func notify(title, text string) { log.Printf("%s: %s", title, text) }
