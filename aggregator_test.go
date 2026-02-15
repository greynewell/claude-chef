package tokentrace

import (
	"sync"
	"testing"

	"github.com/greynewell/mist-go/protocol"
)

func TestAggregatorObserve(t *testing.T) {
	agg := NewAggregator()
	agg.Observe(protocol.TraceSpan{
		TraceID:   "t1",
		SpanID:    "s1",
		Operation: "infer",
		StartNS:   0,
		EndNS:     5_000_000, // 5ms
		Status:    "ok",
		Attrs:     map[string]any{"tokens_in": float64(100), "tokens_out": float64(50)},
	})

	stats := agg.Stats()
	if stats.TotalSpans != 1 {
		t.Errorf("TotalSpans = %d, want 1", stats.TotalSpans)
	}
	if stats.ErrorCount != 0 {
		t.Errorf("ErrorCount = %d, want 0", stats.ErrorCount)
	}
}

func TestAggregatorErrorRate(t *testing.T) {
	agg := NewAggregator()

	for i := 0; i < 8; i++ {
		agg.Observe(protocol.TraceSpan{
			TraceID: "t1", SpanID: "s", Operation: "op",
			StartNS: 0, EndNS: 1_000_000, Status: "ok",
		})
	}
	for i := 0; i < 2; i++ {
		agg.Observe(protocol.TraceSpan{
			TraceID: "t1", SpanID: "s", Operation: "op",
			StartNS: 0, EndNS: 1_000_000, Status: "error",
		})
	}

	stats := agg.Stats()
	if stats.TotalSpans != 10 {
		t.Errorf("TotalSpans = %d, want 10", stats.TotalSpans)
	}
	if stats.ErrorCount != 2 {
		t.Errorf("ErrorCount = %d, want 2", stats.ErrorCount)
	}
	if stats.ErrorRate != 0.2 {
		t.Errorf("ErrorRate = %f, want 0.2", stats.ErrorRate)
	}
}

func TestAggregatorLatency(t *testing.T) {
	agg := NewAggregator()

	latencies := []int64{10, 20, 30, 40, 50, 60, 70, 80, 90, 100} // ms
	for _, ms := range latencies {
		agg.Observe(protocol.TraceSpan{
			TraceID: "t1", SpanID: "s", Operation: "op",
			StartNS: 0, EndNS: ms * 1_000_000, Status: "ok",
		})
	}

	stats := agg.Stats()
	if stats.LatencyP50 == 0 {
		t.Error("LatencyP50 should not be 0")
	}
	if stats.LatencyP99 == 0 {
		t.Error("LatencyP99 should not be 0")
	}
	// P99 should be >= P50.
	if stats.LatencyP99 < stats.LatencyP50 {
		t.Errorf("P99 (%f) < P50 (%f)", stats.LatencyP99, stats.LatencyP50)
	}
}

func TestAggregatorTokenCounts(t *testing.T) {
	agg := NewAggregator()
	agg.Observe(protocol.TraceSpan{
		TraceID: "t1", SpanID: "s1", Operation: "infer",
		StartNS: 0, EndNS: 1_000_000, Status: "ok",
		Attrs: map[string]any{"tokens_in": float64(100), "tokens_out": float64(50)},
	})
	agg.Observe(protocol.TraceSpan{
		TraceID: "t1", SpanID: "s2", Operation: "infer",
		StartNS: 0, EndNS: 1_000_000, Status: "ok",
		Attrs: map[string]any{"tokens_in": float64(200), "tokens_out": float64(100)},
	})

	stats := agg.Stats()
	if stats.TotalTokensIn != 300 {
		t.Errorf("TotalTokensIn = %d, want 300", stats.TotalTokensIn)
	}
	if stats.TotalTokensOut != 150 {
		t.Errorf("TotalTokensOut = %d, want 150", stats.TotalTokensOut)
	}
}

func TestAggregatorCost(t *testing.T) {
	agg := NewAggregator()
	agg.Observe(protocol.TraceSpan{
		TraceID: "t1", SpanID: "s1", Operation: "infer",
		StartNS: 0, EndNS: 1_000_000, Status: "ok",
		Attrs: map[string]any{"cost_usd": 0.05},
	})
	agg.Observe(protocol.TraceSpan{
		TraceID: "t1", SpanID: "s2", Operation: "infer",
		StartNS: 0, EndNS: 1_000_000, Status: "ok",
		Attrs: map[string]any{"cost_usd": 0.03},
	})

	stats := agg.Stats()
	if stats.TotalCostUSD < 0.079 || stats.TotalCostUSD > 0.081 {
		t.Errorf("TotalCostUSD = %f, want ~0.08", stats.TotalCostUSD)
	}
}

func TestAggregatorOperationBreakdown(t *testing.T) {
	agg := NewAggregator()
	agg.Observe(protocol.TraceSpan{
		TraceID: "t1", SpanID: "s1", Operation: "infer",
		StartNS: 0, EndNS: 10_000_000, Status: "ok",
	})
	agg.Observe(protocol.TraceSpan{
		TraceID: "t1", SpanID: "s2", Operation: "eval",
		StartNS: 0, EndNS: 5_000_000, Status: "ok",
	})
	agg.Observe(protocol.TraceSpan{
		TraceID: "t1", SpanID: "s3", Operation: "infer",
		StartNS: 0, EndNS: 20_000_000, Status: "error",
	})

	stats := agg.Stats()
	if stats.ByOperation["infer"].Count != 2 {
		t.Errorf("infer count = %d, want 2", stats.ByOperation["infer"].Count)
	}
	if stats.ByOperation["eval"].Count != 1 {
		t.Errorf("eval count = %d, want 1", stats.ByOperation["eval"].Count)
	}
	if stats.ByOperation["infer"].Errors != 1 {
		t.Errorf("infer errors = %d, want 1", stats.ByOperation["infer"].Errors)
	}
}

func TestAggregatorConcurrent(t *testing.T) {
	agg := NewAggregator()
	var wg sync.WaitGroup

	for w := 0; w < 10; w++ {
		wg.Add(1)
		go func(w int) {
			defer wg.Done()
			for i := 0; i < 100; i++ {
				agg.Observe(protocol.TraceSpan{
					TraceID: "t1", SpanID: "s", Operation: "op",
					StartNS: 0, EndNS: int64(i+1) * 1_000_000, Status: "ok",
					Attrs: map[string]any{"tokens_in": float64(10)},
				})
			}
		}(w)
	}

	// Concurrent readers.
	for r := 0; r < 5; r++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := 0; i < 50; i++ {
				agg.Stats()
			}
		}()
	}

	wg.Wait()

	stats := agg.Stats()
	if stats.TotalSpans != 1000 {
		t.Errorf("TotalSpans = %d, want 1000", stats.TotalSpans)
	}
}

func TestAggregatorEmptyStats(t *testing.T) {
	agg := NewAggregator()
	stats := agg.Stats()

	if stats.TotalSpans != 0 {
		t.Errorf("TotalSpans = %d, want 0", stats.TotalSpans)
	}
	if stats.ErrorRate != 0 {
		t.Errorf("ErrorRate = %f, want 0", stats.ErrorRate)
	}
	if stats.LatencyP50 != 0 {
		t.Errorf("LatencyP50 = %f, want 0", stats.LatencyP50)
	}
}

func TestAggregatorMissingAttrs(t *testing.T) {
	agg := NewAggregator()
	// Span with no attrs — should not panic.
	agg.Observe(protocol.TraceSpan{
		TraceID: "t1", SpanID: "s1", Operation: "op",
		StartNS: 0, EndNS: 1_000_000, Status: "ok",
	})

	stats := agg.Stats()
	if stats.TotalTokensIn != 0 {
		t.Errorf("TotalTokensIn = %d, want 0", stats.TotalTokensIn)
	}
}

func TestAggregatorMetric(t *testing.T) {
	agg := NewAggregator()
	agg.Observe(protocol.TraceSpan{
		TraceID: "t1", SpanID: "s1", Operation: "infer",
		StartNS: 0, EndNS: 50_000_000, Status: "ok",
	})
	agg.Observe(protocol.TraceSpan{
		TraceID: "t1", SpanID: "s2", Operation: "infer",
		StartNS: 0, EndNS: 100_000_000, Status: "error",
	})

	stats := agg.Stats()

	// Test Metric() accessor for alerter integration.
	if stats.Metric("error_rate") != stats.ErrorRate {
		t.Error("Metric(error_rate) mismatch")
	}
	if stats.Metric("latency_p50") != stats.LatencyP50 {
		t.Error("Metric(latency_p50) mismatch")
	}
	if stats.Metric("latency_p99") != stats.LatencyP99 {
		t.Error("Metric(latency_p99) mismatch")
	}
	if stats.Metric("total_cost_usd") != stats.TotalCostUSD {
		t.Error("Metric(total_cost_usd) mismatch")
	}
	if stats.Metric("unknown") != 0 {
		t.Error("Metric(unknown) should return 0")
	}
}
