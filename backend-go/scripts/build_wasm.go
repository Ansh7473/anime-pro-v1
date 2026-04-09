package main

import (
	"fmt"
	"os"
	"os/exec"
)

func main() {
	fmt.Println("Building WASM binary...")
	cmd := exec.Command("go", "build", "-ldflags=-s -w", "-trimpath", "-o", "main.wasm", "cmd/server/main.go")
	
	// Explicitly set WASM environment variables
	cmd.Env = append(os.Environ(), "GOOS=js", "GOARCH=wasm")
	
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		fmt.Printf("Build failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("Build successful: main.wasm created")
}
