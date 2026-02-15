package tokentrace

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/greynewell/mist-go/protocol"
)

func newTestHandler() *Handler {
	cfg := DefaultConfig()
	cfg.MaxSpans = 1000
	cfg.AlertRules = []AlertRule{
		{Metric: "error_rate", Op: ">", Threshold: 0.5, Level: "warning"},
	}
	return NewHandler(cfg)
}

func postSpan(t *testing.T, h *Handler, span protocol.TraceSpan) *httptest.ResponseRecorder {
	t.Helper()
	msg, err := protocol.New("tokentrace-test", protocol.TypeTraceSpan, span)
	if err != nil {
		t.Fatalf("protocol.New: %v", err)
	}
	body, err := msg.Marshal()
	if err != nil {
		t.Fatalf("Marshal: %v", err)
	}

	req := httptest.NewRequest("POST", "/mist", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.Ingest(w, req)
	return w
}

func TestHandlerIngestSuccess(t *testing.T) {
	h := newTestHandler()
	w := postSpan(t, h, protocol.TraceSpan{
		TraceID:   "t1",
		SpanID:    "s1",
		Operation: "infer",
		StartNS:   0,
		EndNS:     5_000_000,
		Status:    "ok",
	})

	if w.Code != http.StatusAccepted {
		t.Errorf("status = %d, want %d", w.Code, http.StatusAccepted)
	}
}

func TestHandlerIngestBadJSON(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest("POST", "/mist", bytes.NewReader([]byte("not json")))
	w := httptest.NewRecorder()
	h.Ingest(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", w.Code, http.StatusBadRequest)
	}
}

func TestHandlerIngestWrongType(t *testing.T) {
	h := newTestHandler()
	msg, _ := protocol.New("test", protocol.TypeHealthPing, protocol.HealthPing{From: "test"})
	body, _ := msg.Marshal()

	req := httptest.NewRequest("POST", "/mist", bytes.NewReader(body))
	w := httptest.NewRecorder()
	h.Ingest(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d for wrong message type", w.Code, http.StatusBadRequest)
	}
}

func TestHandlerTraces(t *testing.T) {
	h := newTestHandler()
	postSpan(t, h, protocol.TraceSpan{
		TraceID: "t1", SpanID: "s1", Operation: "infer",
		StartNS: 0, EndNS: 5_000_000, Status: "ok",
	})
	postSpan(t, h, protocol.TraceSpan{
		TraceID: "t2", SpanID: "s2", Operation: "eval",
		StartNS: 0, EndNS: 10_000_000, Status: "ok",
	})

	req := httptest.NewRequest("GET", "/traces", nil)
	w := httptest.NewRecorder()
	h.Traces(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}

	var resp TracesResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(resp.TraceIDs) < 2 {
		t.Errorf("expected at least 2 trace IDs, got %d", len(resp.TraceIDs))
	}
}

func TestHandlerTraceByID(t *testing.T) {
	h := newTestHandler()
	postSpan(t, h, protocol.TraceSpan{
		TraceID: "t1", SpanID: "s1", Operation: "infer",
		StartNS: 0, EndNS: 5_000_000, Status: "ok",
	})
	postSpan(t, h, protocol.TraceSpan{
		TraceID: "t1", SpanID: "s2", Operation: "eval",
		StartNS: 5_000_000, EndNS: 10_000_000, Status: "ok",
	})

	req := httptest.NewRequest("GET", "/traces/t1", nil)
	w := httptest.NewRecorder()
	h.TraceByID(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}

	var resp TraceResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(resp.Spans) != 2 {
		t.Errorf("expected 2 spans, got %d", len(resp.Spans))
	}
}

func TestHandlerTraceByIDNotFound(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest("GET", "/traces/nonexistent", nil)
	w := httptest.NewRecorder()
	h.TraceByID(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", w.Code)
	}
}

func TestHandlerStats(t *testing.T) {
	h := newTestHandler()
	postSpan(t, h, protocol.TraceSpan{
		TraceID: "t1", SpanID: "s1", Operation: "infer",
		StartNS: 0, EndNS: 50_000_000, Status: "ok",
		Attrs: map[string]any{"tokens_in": float64(100)},
	})

	req := httptest.NewRequest("GET", "/stats", nil)
	w := httptest.NewRecorder()
	h.StatsHandler(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}

	var stats AggregatorStats
	if err := json.Unmarshal(w.Body.Bytes(), &stats); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if stats.TotalSpans != 1 {
		t.Errorf("TotalSpans = %d, want 1", stats.TotalSpans)
	}
	if stats.TotalTokensIn != 100 {
		t.Errorf("TotalTokensIn = %d, want 100", stats.TotalTokensIn)
	}
}

func TestHandlerRecent(t *testing.T) {
	h := newTestHandler()
	for i := 0; i < 5; i++ {
		postSpan(t, h, protocol.TraceSpan{
			TraceID: "t1", SpanID: "s", Operation: "op",
			StartNS: int64(i * 1_000_000), EndNS: int64((i + 1) * 1_000_000), Status: "ok",
		})
	}

	req := httptest.NewRequest("GET", "/traces/recent?limit=3", nil)
	w := httptest.NewRecorder()
	h.RecentSpans(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}

	var resp RecentResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(resp.Spans) != 3 {
		t.Errorf("expected 3 spans, got %d", len(resp.Spans))
	}
}

func TestHandlerRecentDefaultLimit(t *testing.T) {
	h := newTestHandler()
	for i := 0; i < 150; i++ {
		postSpan(t, h, protocol.TraceSpan{
			TraceID: "t1", SpanID: "s", Operation: "op",
			StartNS: 0, EndNS: 1_000_000, Status: "ok",
		})
	}

	req := httptest.NewRequest("GET", "/traces/recent", nil)
	w := httptest.NewRecorder()
	h.RecentSpans(w, req)

	var resp RecentResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Spans) != 100 {
		t.Errorf("default limit: got %d spans, want 100", len(resp.Spans))
	}
}

func TestHandlerAlerts(t *testing.T) {
	cfg := DefaultConfig()
	cfg.MaxSpans = 100
	cfg.AlertRules = []AlertRule{
		{Metric: "error_rate", Op: ">", Threshold: 0.5, Level: "warning"},
	}
	h := NewHandler(cfg)

	// Add spans directly to store+aggregator to avoid triggering
	// ingestion-time alerts (which would start the cooldown).
	for i := 0; i < 10; i++ {
		s := protocol.TraceSpan{
			TraceID: "t1", SpanID: "s", Operation: "op",
			StartNS: 0, EndNS: 1_000_000, Status: "error",
		}
		h.Store().Add(s)
		h.Aggregator().Observe(s)
	}

	// Trigger alert check.
	alerts := h.CheckAlerts()
	if len(alerts) != 1 {
		t.Fatalf("expected 1 alert, got %d", len(alerts))
	}
	if alerts[0].Level != "warning" {
		t.Errorf("level = %s, want warning", alerts[0].Level)
	}
}

func TestHandlerIngestChecksAlerts(t *testing.T) {
	cfg := DefaultConfig()
	cfg.MaxSpans = 100
	cfg.AlertCooldown = 100 * time.Millisecond
	cfg.AlertRules = []AlertRule{
		{Metric: "error_rate", Op: ">", Threshold: 0.5, Level: "warning"},
	}
	h := NewHandler(cfg)

	// Record alerts.
	var gotAlerts []protocol.TraceAlert
	h.OnAlert = func(alert protocol.TraceAlert) {
		gotAlerts = append(gotAlerts, alert)
	}

	// 10 error spans — rate = 1.0, triggers alert.
	for i := 0; i < 10; i++ {
		postSpan(t, h, protocol.TraceSpan{
			TraceID: "t1", SpanID: "s", Operation: "op",
			StartNS: 0, EndNS: 1_000_000, Status: "error",
		})
	}

	if len(gotAlerts) == 0 {
		t.Error("expected OnAlert to be called")
	}
}

func TestHandlerMethodNotAllowed(t *testing.T) {
	h := newTestHandler()

	// GET on ingest endpoint should fail.
	req := httptest.NewRequest("GET", "/mist", nil)
	w := httptest.NewRecorder()
	h.Ingest(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("status = %d, want 405", w.Code)
	}
}
