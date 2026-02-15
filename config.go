// Package tokentrace implements the TokenTrace observability tool for the
// MIST stack. It ingests trace spans, computes real-time metrics (latency,
// tokens, cost, error rates), and emits alerts when thresholds are breached.
package tokentrace

import (
	"fmt"
	"time"
)

// Config holds all settings for a TokenTrace instance.
type Config struct {
	Addr           string        `toml:"addr"`
	MaxSpans       int           `toml:"max_spans"`
	AlertCooldown  time.Duration `toml:"alert_cooldown"`
	AlertRules     []AlertRule   `toml:"alert_rules"`
}

// AlertRule defines a threshold that triggers an alert.
type AlertRule struct {
	Metric    string  `toml:"metric"`    // e.g. "latency_p99", "error_rate", "cost_hourly"
	Op        string  `toml:"op"`        // ">" or "<"
	Threshold float64 `toml:"threshold"`
	Level     string  `toml:"level"`     // "warning" or "critical"
}

// DefaultConfig returns a Config with sensible defaults.
func DefaultConfig() Config {
	return Config{
		Addr:          ":8700",
		MaxSpans:      100_000,
		AlertCooldown: 5 * time.Minute,
	}
}

// Validate checks that the config is well-formed.
func (c *Config) Validate() error {
	if c.Addr == "" {
		return fmt.Errorf("tokentrace: addr is required")
	}
	if c.MaxSpans <= 0 {
		return fmt.Errorf("tokentrace: max_spans must be > 0 (got %d)", c.MaxSpans)
	}
	if c.AlertCooldown <= 0 {
		return fmt.Errorf("tokentrace: alert_cooldown must be > 0")
	}
	for i := range c.AlertRules {
		if err := c.AlertRules[i].Validate(); err != nil {
			return fmt.Errorf("tokentrace: alert_rules[%d]: %w", i, err)
		}
	}
	return nil
}

// Validate checks that the alert rule is well-formed.
func (r *AlertRule) Validate() error {
	if r.Metric == "" {
		return fmt.Errorf("metric is required")
	}
	if r.Op != ">" && r.Op != "<" {
		return fmt.Errorf("op must be '>' or '<' (got %q)", r.Op)
	}
	if r.Level != "warning" && r.Level != "critical" {
		return fmt.Errorf("level must be 'warning' or 'critical' (got %q)", r.Level)
	}
	return nil
}
