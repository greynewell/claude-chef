package tokentrace

import (
	"sync"
	"sync/atomic"

	"github.com/greynewell/mist-go/metrics"
	"github.com/greynewell/mist-go/protocol"
)

// latencyBuckets are histogram boundaries for span latency in milliseconds.
var latencyBuckets = []float64{1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000}

// Aggregator computes real-time metrics from ingested trace spans.
type Aggregator struct {
	registry *metrics.Registry
	latency  *metrics.Histogram

	totalSpans   atomic.Int64
	errorCount   atomic.Int64
	totalTokenIn atomic.Int64
	totalTokenOut atomic.Int64

	// Cost accumulator (float64 stored atomically via mutex).
	costMu       sync.Mutex
	totalCostUSD float64

	// Per-operation stats.
	opMu sync.Mutex
	ops  map[string]*opStats
}

type opStats struct {
	count  int64
	errors int64
}

// NewAggregator creates an aggregator backed by a metrics registry.
func NewAggregator() *Aggregator {
	reg := metrics.NewRegistry()
	return &Aggregator{
		registry: reg,
		latency:  reg.Histogram("span_latency_ms", latencyBuckets),
		ops:      make(map[string]*opStats),
	}
}

// Observe records a span into the aggregator's metrics.
func (a *Aggregator) Observe(span protocol.TraceSpan) {
	a.totalSpans.Add(1)

	if span.Status == "error" {
		a.errorCount.Add(1)
	}

	// Latency in milliseconds.
	latencyMS := float64(span.EndNS-span.StartNS) / 1_000_000.0
	a.latency.Observe(latencyMS)

	// Token counts from attrs.
	if span.Attrs != nil {
		if v, ok := span.Attrs["tokens_in"]; ok {
			if f, ok := v.(float64); ok {
				a.totalTokenIn.Add(int64(f))
			}
		}
		if v, ok := span.Attrs["tokens_out"]; ok {
			if f, ok := v.(float64); ok {
				a.totalTokenOut.Add(int64(f))
			}
		}
		if v, ok := span.Attrs["cost_usd"]; ok {
			if f, ok := v.(float64); ok {
				a.costMu.Lock()
				a.totalCostUSD += f
				a.costMu.Unlock()
			}
		}
	}

	// Per-operation breakdown.
	a.opMu.Lock()
	op, ok := a.ops[span.Operation]
	if !ok {
		op = &opStats{}
		a.ops[span.Operation] = op
	}
	op.count++
	if span.Status == "error" {
		op.errors++
	}
	a.opMu.Unlock()
}

// Stats returns a point-in-time snapshot of aggregated metrics.
func (a *Aggregator) Stats() AggregatorStats {
	total := a.totalSpans.Load()
	errors := a.errorCount.Load()

	snap := a.latency.Snapshot()

	var errorRate float64
	if total > 0 {
		errorRate = float64(errors) / float64(total)
	}

	a.costMu.Lock()
	cost := a.totalCostUSD
	a.costMu.Unlock()

	a.opMu.Lock()
	byOp := make(map[string]OperationStats, len(a.ops))
	for name, op := range a.ops {
		byOp[name] = OperationStats{Count: op.count, Errors: op.errors}
	}
	a.opMu.Unlock()

	return AggregatorStats{
		TotalSpans:    total,
		ErrorCount:    errors,
		ErrorRate:     errorRate,
		LatencyP50:    snap.Percentile(50),
		LatencyP99:    snap.Percentile(99),
		LatencyAvg:    snap.Avg(),
		TotalTokensIn: a.totalTokenIn.Load(),
		TotalTokensOut: a.totalTokenOut.Load(),
		TotalCostUSD:  cost,
		ByOperation:   byOp,
	}
}

// Registry returns the underlying metrics registry for HTTP exposure.
func (a *Aggregator) Registry() *metrics.Registry {
	return a.registry
}

// AggregatorStats is a point-in-time snapshot of all aggregated metrics.
type AggregatorStats struct {
	TotalSpans    int64                    `json:"total_spans"`
	ErrorCount    int64                    `json:"error_count"`
	ErrorRate     float64                  `json:"error_rate"`
	LatencyP50    float64                  `json:"latency_p50_ms"`
	LatencyP99    float64                  `json:"latency_p99_ms"`
	LatencyAvg    float64                  `json:"latency_avg_ms"`
	TotalTokensIn int64                   `json:"total_tokens_in"`
	TotalTokensOut int64                  `json:"total_tokens_out"`
	TotalCostUSD  float64                  `json:"total_cost_usd"`
	ByOperation   map[string]OperationStats `json:"by_operation,omitempty"`
}

// Metric returns the value for a named metric, for use by the alerter.
func (s AggregatorStats) Metric(name string) float64 {
	switch name {
	case "error_rate":
		return s.ErrorRate
	case "latency_p50":
		return s.LatencyP50
	case "latency_p99":
		return s.LatencyP99
	case "latency_avg":
		return s.LatencyAvg
	case "total_cost_usd":
		return s.TotalCostUSD
	default:
		return 0
	}
}

// OperationStats holds per-operation counters.
type OperationStats struct {
	Count  int64 `json:"count"`
	Errors int64 `json:"errors"`
}
