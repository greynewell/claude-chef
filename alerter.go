package tokentrace

import (
	"fmt"
	"sync"
	"time"

	"github.com/greynewell/mist-go/protocol"
)

// Alerter evaluates alert rules against aggregated stats and emits
// TraceAlert payloads when thresholds are breached. Each rule has an
// independent cooldown to prevent alert storms.
type Alerter struct {
	rules    []AlertRule
	cooldown time.Duration

	mu       sync.Mutex
	lastFire map[int]time.Time // rule index → last fire time
}

// NewAlerter creates an alerter with the given rules and cooldown period.
func NewAlerter(rules []AlertRule, cooldown time.Duration) *Alerter {
	return &Alerter{
		rules:    rules,
		cooldown: cooldown,
		lastFire: make(map[int]time.Time),
	}
}

// Check evaluates all rules against the current stats and returns any
// triggered alerts. Rules within their cooldown period are suppressed.
func (a *Alerter) Check(stats AggregatorStats) []protocol.TraceAlert {
	if len(a.rules) == 0 {
		return nil
	}

	now := time.Now()
	var alerts []protocol.TraceAlert

	a.mu.Lock()
	defer a.mu.Unlock()

	for i, rule := range a.rules {
		// Check cooldown.
		if last, ok := a.lastFire[i]; ok {
			if now.Sub(last) < a.cooldown {
				continue
			}
		}

		value := stats.Metric(rule.Metric)
		fired := false

		switch rule.Op {
		case ">":
			fired = value > rule.Threshold
		case "<":
			fired = value < rule.Threshold
		}

		if fired {
			a.lastFire[i] = now
			alerts = append(alerts, protocol.TraceAlert{
				Level:     rule.Level,
				Metric:    rule.Metric,
				Value:     value,
				Threshold: rule.Threshold,
				Message:   fmt.Sprintf("%s %s %.4g (threshold: %.4g)", rule.Metric, rule.Op, value, rule.Threshold),
			})
		}
	}

	return alerts
}
