package models

import (
	"time"

	"gorm.io/gorm"
)

// Release represents a native app version (Windows/Android)
type Release struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	Version     string `gorm:"not null" json:"version"`      // e.g., "1.0.1"
	Platform    string `gorm:"not null;index" json:"platform"` // "windows" or "android"
	DownloadURL string `gorm:"not null" json:"download_url"`
	Changelog   string `json:"changelog"`
	IsLatest    bool   `gorm:"default:false;index" json:"is_latest"`
}
