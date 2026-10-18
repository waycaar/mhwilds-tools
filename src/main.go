package main

import (
	"crypto/rand"
	"encoding/hex"
	"flag"
	"log"
	"net/http"
	"time"
)

// set at build time by release.sh (-X main.appVersion=...)
var appVersion = "dev"
var buildDate = ""

func main() {
	addr := flag.String("serve", "", "only run the web server on this address (for testing)")
	flag.Parse()
	if selfUpdate() || applyWaitingUpdate() {
		return
	}
	cleanupOldCopies()
	removeDevProbe(currentGame()) // no longer needed: the strength table is built in
	if err := loadGameData(); err != nil {
		log.Fatal(err)
	}
	if err := loadBuildEngine(); err != nil {
		log.Fatal(err)
	}
	tb := make([]byte, 16)
	rand.Read(tb)
	token := hex.EncodeToString(tb)
	if *addr != "" {
		log.Printf("serving on http://%s/  token=%s", *addr, token)
		var err error
		for i := 0; i < 30; i++ { // the previous copy may still be closing after a restart
			if err = http.ListenAndServe(*addr, newServer(token)); err != nil {
				time.Sleep(100 * time.Millisecond)
			}
		}
		log.Fatal(err)
	}
	l, url, err := listen()
	if err != nil {
		log.Fatal(err)
	}
	go http.Serve(l, newServer(token))
	runUI(url)
}
