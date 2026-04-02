package models

import (
	"time"

	"gorm.io/gorm"
)

// User model
type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Email     string         `gorm:"uniqueIndex;not null" json:"email"`
	Password  string         `gorm:"not null" json:"-"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	Profiles  []Profile      `gorm:"foreignKey:UserID" json:"profiles"`
}

// Profile model (Multi-profile support)
type Profile struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null" json:"userId"`
	Name      string    `gorm:"not null" json:"name"`
	Avatar    string    `json:"avatar"`
	CreatedAt time.Time `json:"createdAt"`
	// Profile-specific preferences
	AutoNext   bool   `gorm:"default:true" json:"autoNext"`
	AutoSkip   bool   `gorm:"default:false" json:"autoSkip"`
	Language   string `gorm:"default:'multi'" json:"language"` // sub, dub, multi
}

// WatchHistory model
type WatchHistory struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	UserID         uint      `gorm:"not null;index" json:"userId"`
	ProfileID      uint      `gorm:"not null;index" json:"profileId"`
	AnimeID        string    `gorm:"not null;index" json:"animeId"`
	AnimeTitle     string    `json:"animeTitle"`
	AnimePoster    string    `json:"animePoster"`
	EpisodeNumber  int       `gorm:"not null" json:"episodeNumber"`
	Progress       float64   `json:"progress"`       // Seconds watched
	Duration       float64   `json:"duration"`       // Total duration in seconds
	LastWatchedAt  time.Time `json:"lastWatchedAt"`
	Completed      bool      `gorm:"default:false" json:"completed"`
}

// Watchlist model
type Watchlist struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UserID      uint      `gorm:"not null;index" json:"userId"`
	ProfileID   uint      `gorm:"not null;index" json:"profileId"`
	AnimeID     string    `gorm:"not null;index" json:"animeId"`
	AnimeTitle  string    `json:"animeTitle"`
	AnimePoster string    `json:"animePoster"`
	Status      string    `gorm:"default:'PLANNING'" json:"status"` // WATCHING, COMPLETED, PLANNING, DROPPED
	CreatedAt   time.Time `json:"createdAt"`
}

// Favorite model
type Favorite struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UserID      uint      `gorm:"not null;index" json:"userId"`
	ProfileID   uint      `gorm:"not null;index" json:"profileId"`
	AnimeID     string    `gorm:"not null;index" json:"animeId"`
	AnimeTitle  string    `json:"animeTitle"`
	AnimePoster string    `json:"animePoster"`
	CreatedAt   time.Time `json:"createdAt"`
}

// Reaction model
type Reaction struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;index" json:"userId"`
	AnimeID   string    `gorm:"not null;index" json:"animeId"`
	Episode   int       `gorm:"not null;index" json:"episode"`
	Type      string    `gorm:"not null" json:"type"` // fire, heart, shock, etc.
	CreatedAt time.Time `json:"createdAt"`
}

// Comment model
type Comment struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;index" json:"userId"`
	AnimeID   string    `gorm:"not null;index" json:"animeId"`
	Episode   int       `gorm:"not null;index" json:"episode"`
	Content   string    `gorm:"not null" json:"content"`
	ParentID  *uint     `json:"parentId"` // For nested replies
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	
	// Associations
	User    User      `gorm:"foreignKey:UserID" json:"user"`
	Replies []Comment `gorm:"foreignKey:ParentID" json:"replies"`
}
