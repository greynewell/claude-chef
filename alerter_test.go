package tokentrace

import (
	"testing"
	"time"
)

func TestAlerterNoRules(t *testing.T) {
	a := NewAlerter(nil, time.Minute)
	stats := AggregatorStats{TotalSpans: 10, ErrorRate: 0.5}
	alerts := a.Check(stats)
	if len(alerts) != 0 {
		t.Errorf("expected no alerts, got %d", len(alerts))
	}
}

func TestAlerterTriggersAlert(t *testing.T) {
	rules := []AlertRule{
		{Metric: "error_rate", Op: ">", Threshold: 0.1, Level: "warning"},
	}
	a := NewAlerter(rules, time.Minute)

	stats := AggregatorStats{TotalSpans: 10, ErrorRate: 0.5}
	alerts := a.Check(stats)
	if len(alerts) != 1 {
		t.Fatalf("expected 1 alert, got %d", len(alerts))
	}
	if alerts[0].Level != "warning" {
		t.Errorf("level = %s, want warning", alerts[0].Level)
	}
	if alerts[0].Metric != "error_rate" {
		t.Errorf("metric = %s, want error_rate", alerts[0].Metric)
	}
	if alerts[0].Value != 0.5 {
		t.Errorf("value = %f, want 0.5", alerts[0].Value)
	}
	if alerts[0].Threshold != 0.1 {
		t.Errorf("threshold = %f, want 0.1", alerts[0].Threshold)
	}
}

func TestAlerterNoTriggerBelowThreshold(t *testing.T) {
	rules := []AlertRule{
		{Metric: "error_rate", Op: ">", Threshold: 0.5, Level: "warning"},
	}
	a := NewAlerter(rules, time.Minute)

	stats := AggregatorStats{TotalSpans: 10, ErrorRate: 0.1}
	alerts := a.Check(stats)
	if len(alerts) != 0 {
		t.Errorf("expected no alerts, got %d", len(alerts))
	}
}

func TestAlerterLessThanOp(t *testing.T) {
	rules := []AlertRule{
		{Metric: "latency_p99", Op: "<", Threshold: 100, Level: "critical"},
	}
	a := NewAlerter(rules, time.Minute)

	// Value below threshold — should fire.
	stats := AggregatorStats{LatencyP99: 50}
	alerts := a.Check(stats)
	if len(alerts) != 1 {
		t.Fatalf("expected 1 alert, got %d", len(alerts))
	}
	if alerts[0].Level != "critical" {
		t.Errorf("level = %s, want critical", alerts[0].Level)
	}
}

func TestAlerterCooldown(t *testing.T) {
	rules := []AlertRule{
		{Metric: "error_rate", Op: ">", Threshold: 0.1, Level: "warning"},
	}
	a := NewAlerter(rules, 100*time.Millisecond)

	stats := AggregatorStats{TotalSpans: 10, ErrorRate: 0.5}

	// First check fires.
	alerts := a.Check(stats)
	if len(alerts) != 1 {
		t.Fatalf("first check: expected 1 alert, got %d", len(alerts))
	}

	// Immediate second check should be suppressed by cooldown.
	alerts = a.Check(stats)
	if len(alerts) != 0 {
		t.Errorf("second check: expected 0 alerts (cooldown), got %d", len(alerts))
	}

	// After cooldown expires, should fire again.
	time.Sleep(150 * time.Millisecond)
	alerts = a.Check(stats)
	if len(alerts) != 1 {
		t.Errorf("after cooldown: expected 1 alert, got %d", len(alerts))
	}
}

func TestAlerterMultipleRules(t *testing.T) {
	rules := []AlertRule{
		{Metric: "error_rate", Op: ">", Threshold: 0.1, Level: "warning"},
		{Metric: "latency_p99", Op: ">", Threshold: 100, Level: "critical"},
	}
	a := NewAlerter(rules, time.Minute)

	// Both should fire.
	stats := AggregatorStats{ErrorRate: 0.5, LatencyP99: 200}
	alerts := a.Check(stats)
	if len(alerts) != 2 {
		t.Errorf("expected 2 alerts, got %d", len(alerts))
	}
}

func TestAlerterEqualToThreshold(t *testing.T) {
	rules := []AlertRule{
		{Metric: "error_rate", Op: ">", Threshold: 0.5, Level: "warning"},
	}
	a := NewAlerter(rules, time.Minute)

	// Exactly at threshold — should NOT fire (strict >).
	stats := AggregatorStats{ErrorRate: 0.5}
	alerts := a.Check(stats)
	if len(alerts) != 0 {
		t.Errorf("expected no alerts at threshold, got %d", len(alerts))
	}
}

func TestAlerterCooldownPerRule(t *testing.T) {
	rules := []AlertRule{
		{Metric: "error_rate", Op: ">", Threshold: 0.1, Level: "warning"},
		{Metric: "latency_p99", Op: ">", Threshold: 100, Level: "critical"},
	}
	a := NewAlerter(rules, 100*time.Millisecond)

	stats := AggregatorStats{ErrorRate: 0.5, LatencyP99: 200}

	// Both fire on first check.
	alerts := a.Check(stats)
	if len(alerts) != 2 {
		t.Fatalf("first: expected 2 alerts, got %d", len(alerts))
	}

	// Both suppressed.
	alerts = a.Check(stats)
	if len(alerts) != 0 {
		t.Errorf("second: expected 0, got %d", len(alerts))
	}

	// After cooldown, both fire again.
	time.Sleep(150 * time.Millisecond)
	alerts = a.Check(stats)
	if len(alerts) != 2 {
		t.Errorf("after cooldown: expected 2, got %d", len(alerts))
	}
}

func TestAlerterMessageContent(t *testing.T) {
	rules := []AlertRule{
		{Metric: "latency_p99", Op: ">", Threshold: 500, Level: "warning"},
	}
	a := NewAlerter(rules, time.Minute)

	stats := AggregatorStats{LatencyP99: 750}
	alerts := a.Check(stats)
	if len(alerts) != 1 {
		t.Fatalf("expected 1 alert, got %d", len(alerts))
	}
	if alerts[0].Message == "" {
		t.Error("alert message should not be empty")
	}
}
