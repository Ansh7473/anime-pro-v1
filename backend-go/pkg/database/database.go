package database

import (
	"context"
	"log"
	"os"

	firebase "firebase.google.com/go/v4"
	"cloud.google.com/go/firestore"
	"google.golang.org/api/option"
)

var DB *firestore.Client
var Ctx = context.Background()

// InitDB initializes the Firebase Admin SDK and Firestore client
func InitDB() {
	projectID := os.Getenv("FIREBASE_PROJECT_ID")
	if projectID == "" {
		log.Println("⚠️ FIREBASE_PROJECT_ID not set, database features will be disabled")
		return
	}

	var app *firebase.App
	var err error

	// Check for service account JSON content or file path
	serviceAccountJSON := os.Getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
	var opt option.ClientOption

	if serviceAccountJSON != "" {
		if _, err := os.Stat(serviceAccountJSON); err == nil {
			// It's a file path
			opt = option.WithCredentialsFile(serviceAccountJSON)
		} else {
			// It's raw JSON content
			opt = option.WithCredentialsJSON([]byte(serviceAccountJSON))
		}
		app, err = firebase.NewApp(Ctx, &firebase.Config{ProjectID: projectID}, opt)
	} else {
		// Fallback to default credentials
		app, err = firebase.NewApp(Ctx, &firebase.Config{ProjectID: projectID})
	}

	if err != nil {
		log.Fatalf("❌ Error initializing Firebase App: %v", err)
	}

	client, err := app.Firestore(Ctx)
	if err != nil {
		log.Fatalf("❌ Error initializing Firestore client: %v", err)
	}

	DB = client
	log.Println("✅ Firebase Firestore connected and ready (Spark Plan optimized)")
}

// Update is an alias for firestore.Update
type Update = firestore.Update

// Directions
const (
	Asc  = firestore.Asc
	Desc = firestore.Desc
)

// CloseDB closes the Firestore client connection
func CloseDB() {
	if DB != nil {
		DB.Close()
	}
}

// WaitForDB is now a no-op for Firestore as it uses lazy connection
func WaitForDB() bool {
	return DB != nil
}
