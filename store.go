package tokentrace

import (
	"sync"

	"github.com/greynewell/mist-go/protocol"
)

// Store is a fixed-capacity ring buffer of trace spans, indexed by trace ID
// for fast lookup. When the buffer is full, the oldest span is evicted.
type Store struct {
	mu    sync.RWMutex
	spans []protocol.TraceSpan
	cap   int
	head  int // next write position
	count int // number of spans stored (≤ cap)

	// index maps trace_id → set of ring buffer positions.
	// Positions are invalidated on eviction.
	index map[string]map[int]struct{}
}

// NewStore creates a span store with the given capacity.
func NewStore(capacity int) *Store {
	return &Store{
		spans: make([]protocol.TraceSpan, capacity),
		cap:   capacity,
		index: make(map[string]map[int]struct{}),
	}
}

// Add inserts a span into the store, evicting the oldest if full.
func (s *Store) Add(span protocol.TraceSpan) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Evict the span at the current write position if the buffer is full.
	if s.count == s.cap {
		evicted := s.spans[s.head]
		s.removeFromIndex(evicted.TraceID, s.head)
	}

	pos := s.head
	s.spans[pos] = span
	s.addToIndex(span.TraceID, pos)

	s.head = (s.head + 1) % s.cap
	if s.count < s.cap {
		s.count++
	}
}

// GetTrace returns all stored spans for the given trace ID.
func (s *Store) GetTrace(traceID string) []protocol.TraceSpan {
	s.mu.RLock()
	defer s.mu.RUnlock()

	positions, ok := s.index[traceID]
	if !ok {
		return nil
	}

	result := make([]protocol.TraceSpan, 0, len(positions))
	for pos := range positions {
		result = append(result, s.spans[pos])
	}
	return result
}

// Recent returns the n most recently added spans, newest first.
func (s *Store) Recent(n int) []protocol.TraceSpan {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if n > s.count {
		n = s.count
	}
	if n == 0 {
		return nil
	}

	result := make([]protocol.TraceSpan, n)
	for i := 0; i < n; i++ {
		// Walk backwards from head.
		pos := (s.head - 1 - i + s.cap) % s.cap
		result[i] = s.spans[pos]
	}
	return result
}

// Len returns the number of spans currently stored.
func (s *Store) Len() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.count
}

// TraceIDs returns all distinct trace IDs currently in the store.
func (s *Store) TraceIDs() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	ids := make([]string, 0, len(s.index))
	for id := range s.index {
		ids = append(ids, id)
	}
	return ids
}

func (s *Store) addToIndex(traceID string, pos int) {
	positions, ok := s.index[traceID]
	if !ok {
		positions = make(map[int]struct{})
		s.index[traceID] = positions
	}
	positions[pos] = struct{}{}
}

func (s *Store) removeFromIndex(traceID string, pos int) {
	positions, ok := s.index[traceID]
	if !ok {
		return
	}
	delete(positions, pos)
	if len(positions) == 0 {
		delete(s.index, traceID)
	}
}
