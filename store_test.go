package tokentrace

import (
	"fmt"
	"sync"
	"testing"

	"github.com/greynewell/mist-go/protocol"
)

func span(traceID, spanID, op string, startNS, endNS int64) protocol.TraceSpan {
	return protocol.TraceSpan{
		TraceID:   traceID,
		SpanID:    spanID,
		Operation: op,
		StartNS:   startNS,
		EndNS:     endNS,
		Status:    "ok",
	}
}

func TestStoreAdd(t *testing.T) {
	s := NewStore(10)
	s.Add(span("t1", "s1", "infer", 100, 200))

	if s.Len() != 1 {
		t.Errorf("Len = %d, want 1", s.Len())
	}
}

func TestStoreGetTrace(t *testing.T) {
	s := NewStore(100)
	s.Add(span("t1", "s1", "infer", 100, 200))
	s.Add(span("t1", "s2", "eval", 200, 300))
	s.Add(span("t2", "s3", "infer", 100, 250))

	spans := s.GetTrace("t1")
	if len(spans) != 2 {
		t.Fatalf("GetTrace(t1) = %d spans, want 2", len(spans))
	}
	if spans[0].SpanID != "s1" || spans[1].SpanID != "s2" {
		t.Errorf("unexpected span IDs: %s, %s", spans[0].SpanID, spans[1].SpanID)
	}
}

func TestStoreGetTraceNotFound(t *testing.T) {
	s := NewStore(10)
	spans := s.GetTrace("nonexistent")
	if len(spans) != 0 {
		t.Errorf("expected empty result, got %d spans", len(spans))
	}
}

func TestStoreRecent(t *testing.T) {
	s := NewStore(100)
	for i := 0; i < 5; i++ {
		s.Add(span("t1", fmt.Sprintf("s%d", i), "op", int64(i*100), int64(i*100+50)))
	}

	recent := s.Recent(3)
	if len(recent) != 3 {
		t.Fatalf("Recent(3) = %d, want 3", len(recent))
	}
	// Most recent first.
	if recent[0].SpanID != "s4" {
		t.Errorf("most recent span = %s, want s4", recent[0].SpanID)
	}
}

func TestStoreRecentMoreThanAvailable(t *testing.T) {
	s := NewStore(100)
	s.Add(span("t1", "s1", "op", 100, 200))

	recent := s.Recent(10)
	if len(recent) != 1 {
		t.Errorf("Recent(10) = %d, want 1", len(recent))
	}
}

func TestStoreRingBufferEviction(t *testing.T) {
	s := NewStore(5)
	for i := 0; i < 10; i++ {
		s.Add(span(fmt.Sprintf("t%d", i), fmt.Sprintf("s%d", i), "op", int64(i*100), int64(i*100+50)))
	}

	// Only 5 most recent should remain.
	if s.Len() != 5 {
		t.Errorf("Len = %d, want 5", s.Len())
	}

	// Oldest (t0-t4) should be evicted.
	if spans := s.GetTrace("t0"); len(spans) != 0 {
		t.Error("t0 should have been evicted")
	}

	// Most recent (t9) should still be there.
	if spans := s.GetTrace("t9"); len(spans) != 1 {
		t.Error("t9 should exist")
	}
}

func TestStoreEvictionCleansIndex(t *testing.T) {
	s := NewStore(3)

	// Add 3 spans for trace t1.
	s.Add(span("t1", "s1", "op", 100, 200))
	s.Add(span("t1", "s2", "op", 200, 300))
	s.Add(span("t1", "s3", "op", 300, 400))

	// All 3 should be there.
	if spans := s.GetTrace("t1"); len(spans) != 3 {
		t.Fatalf("expected 3 spans, got %d", len(spans))
	}

	// Add 3 more spans for a different trace, evicting all t1 spans.
	s.Add(span("t2", "s4", "op", 400, 500))
	s.Add(span("t2", "s5", "op", 500, 600))
	s.Add(span("t2", "s6", "op", 600, 700))

	// t1 should be gone from the index.
	if spans := s.GetTrace("t1"); len(spans) != 0 {
		t.Errorf("t1 should be evicted, got %d spans", len(spans))
	}
}

func TestStoreRecentOrder(t *testing.T) {
	s := NewStore(100)
	s.Add(span("t1", "first", "op", 100, 200))
	s.Add(span("t2", "second", "op", 200, 300))
	s.Add(span("t3", "third", "op", 300, 400))

	recent := s.Recent(3)
	if recent[0].SpanID != "third" {
		t.Errorf("first result should be most recent, got %s", recent[0].SpanID)
	}
	if recent[2].SpanID != "first" {
		t.Errorf("last result should be oldest, got %s", recent[2].SpanID)
	}
}

func TestStoreTraceIDs(t *testing.T) {
	s := NewStore(100)
	s.Add(span("t1", "s1", "op", 100, 200))
	s.Add(span("t2", "s2", "op", 200, 300))
	s.Add(span("t1", "s3", "op", 300, 400))
	s.Add(span("t3", "s4", "op", 400, 500))

	ids := s.TraceIDs()
	if len(ids) != 3 {
		t.Errorf("TraceIDs = %d, want 3", len(ids))
	}
}

func TestStoreConcurrent(t *testing.T) {
	s := NewStore(1000)
	var wg sync.WaitGroup

	// 10 writers.
	for w := 0; w < 10; w++ {
		wg.Add(1)
		go func(w int) {
			defer wg.Done()
			for i := 0; i < 100; i++ {
				s.Add(span(
					fmt.Sprintf("t%d", w),
					fmt.Sprintf("s%d-%d", w, i),
					"op",
					int64(i*100),
					int64(i*100+50),
				))
			}
		}(w)
	}

	// 5 readers.
	for r := 0; r < 5; r++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := 0; i < 100; i++ {
				s.Recent(10)
				s.GetTrace("t0")
				s.Len()
				s.TraceIDs()
			}
		}()
	}

	wg.Wait()

	if s.Len() > 1000 {
		t.Errorf("Len = %d, should not exceed capacity", s.Len())
	}
}

func TestStoreRecentEmpty(t *testing.T) {
	s := NewStore(10)
	recent := s.Recent(5)
	if len(recent) != 0 {
		t.Errorf("Recent on empty store = %d, want 0", len(recent))
	}
}

func TestStoreRecentWraparound(t *testing.T) {
	s := NewStore(4)
	// Fill buffer and wrap around.
	for i := 0; i < 7; i++ {
		s.Add(span("t1", fmt.Sprintf("s%d", i), "op", int64(i), int64(i+1)))
	}

	recent := s.Recent(4)
	if len(recent) != 4 {
		t.Fatalf("Recent(4) = %d, want 4", len(recent))
	}
	// Most recent should be s6.
	if recent[0].SpanID != "s6" {
		t.Errorf("most recent = %s, want s6", recent[0].SpanID)
	}
	// Oldest in buffer should be s3.
	if recent[3].SpanID != "s3" {
		t.Errorf("oldest in buffer = %s, want s3", recent[3].SpanID)
	}
}
