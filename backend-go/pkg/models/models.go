package models

import (
	"time"
)

// User model
type User struct {
	ID        string    `json:"id" firestore:"id"`
	Email     string    `json:"email" firestore:"email"`
	Password  string    `json:"-" firestore:"password"`
	CreatedAt time.Time `json:"createdAt" firestore:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt" firestore:"updatedAt"`
	DeletedAt *time.Time `json:"-" firestore:"deletedAt,omitempty"`
	Role      string    `json:"role" firestore:"role"` // user, admin
	Profiles  []Profile `json:"profiles" firestore:"-"` // Handled separately or as subcollection
}

// Profile model (Multi-profile support)
type Profile struct {
	ID        string    `json:"id" firestore:"id"`
	UserID    string    `json:"userId" firestore:"userId"`
	Name      string    `json:"name" firestore:"name"`
	Avatar    string    `json:"avatar" firestore:"avatar"`
	CreatedAt time.Time `json:"createdAt" firestore:"createdAt"`
	// Profile-specific preferences
	AutoNext bool   `json:"autoNext" firestore:"autoNext"`
	AutoSkip bool   `json:"autoSkip" firestore:"autoSkip"`
	Language string `json:"language" firestore:"language"` // sub, dub, multi
	Theme    string `json:"theme" firestore:"theme"`       // intelligence, stealth, cyberpunk
}

// WatchHistory model
type WatchHistory struct {
	ID            string    `json:"id" firestore:"id"`
	UserID        string    `json:"userId" firestore:"userId"`
	ProfileID     string    `json:"profileId" firestore:"profileId"`
	AnimeID       string    `json:"animeId" firestore:"animeId"`
	AnimeTitle    string    `json:"animeTitle" firestore:"animeTitle"`
	AnimePoster   string    `json:"animePoster" firestore:"animePoster"`
	EpisodeNumber int       `json:"episodeNumber" firestore:"episodeNumber"`
	Progress      float64   `json:"progress" firestore:"progress"` // Seconds watched
	Duration      float64   `json:"duration" firestore:"duration"` // Total duration in seconds
	LastWatchedAt time.Time `json:"lastWatchedAt" firestore:"lastWatchedAt"`
	Completed     bool      `json:"completed" firestore:"completed"`
}

// Watchlist model
type Watchlist struct {
	ID          string    `json:"id" firestore:"id"`
	UserID      string    `json:"userId" firestore:"userId"`
	ProfileID   string    `json:"profileId" firestore:"profileId"`
	AnimeID     string    `json:"animeId" firestore:"animeId"`
	AnimeTitle  string    `json:"animeTitle" firestore:"animeTitle"`
	AnimePoster string    `json:"animePoster" firestore:"animePoster"`
	Status      string    `json:"status" firestore:"status"` // WATCHING, COMPLETED, PLANNING, DROPPED
	CreatedAt   time.Time `json:"createdAt" firestore:"createdAt"`
}

// Favorite model
type Favorite struct {
	ID          string    `json:"id" firestore:"id"`
	UserID      string    `json:"userId" firestore:"userId"`
	ProfileID   string    `json:"profileId" firestore:"profileId"`
	AnimeID     string    `json:"animeId" firestore:"animeId"`
	AnimeTitle  string    `json:"animeTitle" firestore:"animeTitle"`
	AnimePoster string    `json:"animePoster" firestore:"animePoster"`
	CreatedAt   time.Time `json:"createdAt" firestore:"createdAt"`
}

// Reaction model
type Reaction struct {
	ID        string    `json:"id" firestore:"id"`
	UserID    string    `json:"userId" firestore:"userId"`
	AnimeID   string    `json:"animeId" firestore:"animeId"`
	Episode   int       `json:"episode" firestore:"episode"`
	Type      string    `json:"type" firestore:"type"` // fire, heart, shock, etc.
	CreatedAt time.Time `json:"createdAt" firestore:"createdAt"`
}

// Comment model
type Comment struct {
	ID        string    `json:"id" firestore:"id"`
	UserID    string    `json:"userId" firestore:"userId"`
	UserName  string    `json:"userName" firestore:"userName"`
	UserAvatar string    `json:"userAvatar" firestore:"userAvatar"`
	AnimeID   string    `json:"animeId" firestore:"animeId"`
	Episode   int       `json:"episode" firestore:"episode"`
	Content   string    `json:"content" firestore:"content"`
	ParentID  string    `json:"parentId" firestore:"parentId"` // For nested replies
	CreatedAt time.Time `json:"createdAt" firestore:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt" firestore:"updatedAt"`
	
	// Associations (In Firestore we store the IDs or fetch as needed)
	User    User      `json:"user" firestore:"-"`
	Replies []Comment `json:"replies" firestore:"-"`
}

// Release model for App Updates
type Release struct {
	ID          string    `json:"id" firestore:"id"`
	Version     string    `json:"version" firestore:"version"`
	Platform    string    `json:"platform" firestore:"platform"` // windows, android
	DownloadURL string    `json:"download_url" firestore:"download_url"`
	Changelog   string    `json:"changelog" firestore:"changelog"`
	IsLatest    bool      `json:"is_latest" firestore:"is_latest"`
	CreatedAt   time.Time `json:"createdAt" firestore:"createdAt"`
}
