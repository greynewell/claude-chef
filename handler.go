package tokentrace

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/greynewell/mist-go/protocol"
)

// Handler provides HTTP handlers for the TokenTrace API.
type Handler struct {
	store *Store
	agg   *Aggregator
	alert *Alerter

	// OnAlert is called when an alert fires. Used for logging, forwarding, etc.
	OnAlert func(protocol.TraceAlert)
}

// NewHandler creates a fully wired handler from the given config.
func NewHandler(cfg Config) *Handler {
	return &Handler{
		store: NewStore(cfg.MaxSpans),
		agg:   NewAggregator(),
		alert: NewAlerter(cfg.AlertRules, cfg.AlertCooldown),
	}
}

// Store returns the underlying span store.
func (h *Handler) Store() *Store { return h.store }

// Aggregator returns the underlying aggregator.
func (h *Handler) Aggregator() *Aggregator { return h.agg }

// Ingest handles POST /mist — accepts MIST protocol messages containing trace spans.
func (h *Handler) Ingest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var msg protocol.Message
	if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
		http.Error(w, "invalid message: "+err.Error(), http.StatusBadRequest)
		return
	}

	if msg.Type != protocol.TypeTraceSpan {
		http.Error(w, "expected type trace.span, got "+msg.Type, http.StatusBadRequest)
		return
	}

	var span protocol.TraceSpan
	if err := msg.Decode(&span); err != nil {
		http.Error(w, "invalid span payload: "+err.Error(), http.StatusBadRequest)
		return
	}

	h.store.Add(span)
	h.agg.Observe(span)

	// Check alerts after each ingestion.
	alerts := h.alert.Check(h.agg.Stats())
	for _, a := range alerts {
		if h.OnAlert != nil {
			h.OnAlert(a)
		}
	}

	w.WriteHeader(http.StatusAccepted)
}

// TracesResponse is the JSON body for GET /traces.
type TracesResponse struct {
	TraceIDs []string `json:"trace_ids"`
	Count    int      `json:"count"`
}

// Traces handles GET /traces — returns all known trace IDs.
func (h *Handler) Traces(w http.ResponseWriter, r *http.Request) {
	ids := h.store.TraceIDs()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(TracesResponse{
		TraceIDs: ids,
		Count:    len(ids),
	})
}

// TraceResponse is the JSON body for GET /traces/{id}.
type TraceResponse struct {
	TraceID string                `json:"trace_id"`
	Spans   []protocol.TraceSpan `json:"spans"`
}

// TraceByID handles GET /traces/{id} — returns all spans for a trace.
func (h *Handler) TraceByID(w http.ResponseWriter, r *http.Request) {
	// Extract trace ID from URL path: /traces/{id}
	path := strings.TrimPrefix(r.URL.Path, "/traces/")
	traceID := strings.TrimRight(path, "/")
	if traceID == "" {
		http.Error(w, "trace ID required", http.StatusBadRequest)
		return
	}

	spans := h.store.GetTrace(traceID)
	if len(spans) == 0 {
		http.Error(w, "trace not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(TraceResponse{
		TraceID: traceID,
		Spans:   spans,
	})
}

// RecentResponse is the JSON body for GET /traces/recent.
type RecentResponse struct {
	Spans []protocol.TraceSpan `json:"spans"`
	Count int                  `json:"count"`
}

// RecentSpans handles GET /traces/recent?limit=N — returns most recent spans.
func (h *Handler) RecentSpans(w http.ResponseWriter, r *http.Request) {
	limit := 100
	if s := r.URL.Query().Get("limit"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 {
			limit = n
		}
	}

	spans := h.store.Recent(limit)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(RecentResponse{
		Spans: spans,
		Count: len(spans),
	})
}

// StatsHandler handles GET /stats — returns aggregated metrics.
func (h *Handler) StatsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(h.agg.Stats())
}

// CheckAlerts manually triggers an alert check and returns any fired alerts.
func (h *Handler) CheckAlerts() []protocol.TraceAlert {
	return h.alert.Check(h.agg.Stats())
}
