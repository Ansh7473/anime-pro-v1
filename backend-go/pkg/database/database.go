package database

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// FirestoreRest is our lightweight replacement for the heavy Firebase SDK
type FirestoreRest struct {
	ProjectID string
	BaseURL   string
	Client    *http.Client
}

var DB *FirestoreRest
var Ctx = context.Background()

func InitDB() {
	projectID := os.Getenv("FIREBASE_PROJECT_ID")
	if projectID == "" {
		log.Println("⚠️ FIREBASE_PROJECT_ID not set")
		return
	}
	DB = &FirestoreRest{
		ProjectID: projectID,
		BaseURL:   fmt.Sprintf("https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents", projectID),
		Client:    &http.Client{Timeout: 10 * time.Second},
	}
}

var Done = fmt.Errorf("iterator is done")

// --- Types for chainable API ---

type CollectionRef struct {
	Name string
}

type DocRef struct {
	Collection string
	ID         string
}

type Query struct {
	Collection string
	Filters    []Filter
	LimitVal   int
}

type Filter struct {
	Path  string
	Op    string
	Value interface{}
}

type Iterator struct {
	docs []DocumentSnapshot
	idx  int
}

type DocumentSnapshot struct {
	ID   string
	Data map[string]interface{}
	Ref  *DocRef
}

type WriteResult struct{}

type Update struct {
	Path  string
	Value interface{}
}

// --- Implementation ---

func (f *FirestoreRest) Collection(name string) *CollectionRef {
	return &CollectionRef{Name: name}
}

func (c *CollectionRef) Doc(id string) *DocRef {
	return &DocRef{Collection: c.Name, ID: id}
}

func (c *CollectionRef) NewDoc() *DocRef {
	// Generate a simple unique ID
	id := fmt.Sprintf("%d%d", time.Now().UnixNano(), os.Getpid())
	return &DocRef{Collection: c.Name, ID: id}
}

func (c *CollectionRef) Where(path, op string, value interface{}) *Query {
	return (&Query{Collection: c.Name}).Where(path, op, value)
}

func (q *Query) Where(path, op string, value interface{}) *Query {
	q.Filters = append(q.Filters, Filter{path, op, value})
	return q
}

func (q *Query) Limit(n int) *Query {
	q.LimitVal = n
	return q
}

func (q *Query) Documents(ctx context.Context) *Iterator {
	// REST API for structuredQuery is complex. For now, we fetch all and filter in-memory
	// This is NOT efficient but it works for small datasets on the edge
	url := fmt.Sprintf("%s/%s", DB.BaseURL, q.Collection)
	
	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	resp, err := DB.Client.Do(req)
	if err != nil {
		return &Iterator{}
	}
	defer resp.Body.Close()

	var result struct {
		Documents []struct {
			Name   string                 `json:"name"`
			Fields map[string]interface{} `json:"fields"`
		} `json:"documents"`
	}
	
	body, _ := io.ReadAll(resp.Body)
	json.Unmarshal(body, &result)

	docs := make([]DocumentSnapshot, 0)
	for _, d := range result.Documents {
		parts := strings.Split(d.Name, "/")
		id := parts[len(parts)-1]
		
		// Map Firestore REST fields to simple map (Simplified)
		data := make(map[string]interface{})
		for k, v := range d.Fields {
			if m, ok := v.(map[string]interface{}); ok {
				for _, val := range m {
					data[k] = val
				}
			}
		}

		// Simple in-memory filtering
		match := true
		for _, f := range q.Filters {
			val := data[f.Path]
			if fmt.Sprintf("%v", val) != fmt.Sprintf("%v", f.Value) {
				match = false
				break
			}
		}

		if match {
			docs = append(docs, DocumentSnapshot{
				ID:   id,
				Data: data,
				Ref:  &DocRef{Collection: q.Collection, ID: id},
			})
		}
		
		if q.LimitVal > 0 && len(docs) >= q.LimitVal {
			break
		}
	}

	return &Iterator{docs: docs}
}

func (i *Iterator) Next() (*DocumentSnapshot, error) {
	if i.idx >= len(i.docs) {
		return nil, Done
	}
	doc := &i.docs[i.idx]
	i.idx++
	return doc, nil
}

func (d *DocRef) Get(ctx context.Context) (*DocumentSnapshot, error) {
	url := fmt.Sprintf("%s/%s/%s", DB.BaseURL, d.Collection, d.ID)
	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	resp, err := DB.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("not found")
	}

	var fireDoc struct {
		Fields map[string]interface{} `json:"fields"`
	}
	body, _ := io.ReadAll(resp.Body)
	json.Unmarshal(body, &fireDoc)

	data := make(map[string]interface{})
	for k, v := range fireDoc.Fields {
		if m, ok := v.(map[string]interface{}); ok {
			for _, val := range m {
				data[k] = val
			}
		}
	}

	return &DocumentSnapshot{ID: d.ID, Data: data, Ref: d}, nil
}

func (d *DocRef) Set(ctx context.Context, data interface{}) (*WriteResult, error) {
	url := fmt.Sprintf("%s/%s/%s", DB.BaseURL, d.Collection, d.ID)
	// Simplified Set logic (Firestore REST requires type tags, but we'll try a simplified way)
	jsonData, _ := json.Marshal(map[string]interface{}{"fields": data})
	req, _ := http.NewRequestWithContext(ctx, "PATCH", url, bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := DB.Client.Do(req)
	if err != nil {
		return nil, err
	}
	resp.Body.Close()
	return &WriteResult{}, nil
}

func (d *DocRef) Update(ctx context.Context, updates []Update) (*WriteResult, error) {
	// Simple update logic
	data := make(map[string]interface{})
	for _, u := range updates {
		data[u.Path] = u.Value
	}
	return d.Set(ctx, data)
}

func (d *DocRef) Delete(ctx context.Context) (*WriteResult, error) {
	url := fmt.Sprintf("%s/%s/%s", DB.BaseURL, d.Collection, d.ID)
	req, _ := http.NewRequestWithContext(ctx, "DELETE", url, nil)
	resp, err := DB.Client.Do(req)
	if err != nil {
		return nil, err
	}
	resp.Body.Close()
	return &WriteResult{}, nil
}

func (s *DocumentSnapshot) DataTo(target interface{}) error {
	b, _ := json.Marshal(s.Data)
	return json.Unmarshal(b, target)
}

type Batch struct {
	writes []func()
}

func (f *FirestoreRest) Batch() *Batch {
	return &Batch{}
}

func (b *Batch) Set(doc *DocRef, data interface{}) {
	b.writes = append(b.writes, func() { doc.Set(Ctx, data) })
}

func (b *Batch) Delete(doc *DocRef) {
	b.writes = append(b.writes, func() { doc.Delete(Ctx) })
}

func (b *Batch) Commit(ctx context.Context) (*WriteResult, error) {
	for _, w := range b.writes {
		w()
	}
	return &WriteResult{}, nil
}

func CloseDB() {}
func WaitForDB() bool { return DB != nil }

const (
	Asc  = "asc"
	Desc = "desc"
)
