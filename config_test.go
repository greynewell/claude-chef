package tokentrace

import (
	"testing"
	"time"
)

func TestDefaultConfig(t *testing.T) {
	cfg := DefaultConfig()
	if cfg.Addr != ":8700" {
		t.Errorf("Addr = %s, want :8700", cfg.Addr)
	}
	if cfg.MaxSpans != 100000 {
		t.Errorf("MaxSpans = %d, want 100000", cfg.MaxSpans)
	}
	if cfg.AlertCooldown != 5*time.Minute {
		t.Errorf("AlertCooldown = %v, want 5m", cfg.AlertCooldown)
	}
}

func TestConfigValidation(t *testing.T) {
	tests := []struct {
		name    string
		modify  func(*Config)
		wantErr bool
	}{
		{"valid default", func(c *Config) {}, false},
		{"empty addr", func(c *Config) { c.Addr = "" }, true},
		{"zero max spans", func(c *Config) { c.MaxSpans = 0 }, true},
		{"negative max spans", func(c *Config) { c.MaxSpans = -1 }, true},
		{"zero cooldown", func(c *Config) { c.AlertCooldown = 0 }, true},
		{"custom addr", func(c *Config) { c.Addr = ":9090" }, false},
		{"large max spans", func(c *Config) { c.MaxSpans = 10_000_000 }, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := DefaultConfig()
			tt.modify(&cfg)
			err := cfg.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestAlertRuleValidation(t *testing.T) {
	tests := []struct {
		name    string
		rule    AlertRule
		wantErr bool
	}{
		{
			"valid rule",
			AlertRule{Metric: "latency_p99", Op: ">", Threshold: 1000, Level: "warning"},
			false,
		},
		{
			"empty metric",
			AlertRule{Metric: "", Op: ">", Threshold: 1000, Level: "warning"},
			true,
		},
		{
			"invalid op",
			AlertRule{Metric: "latency_p99", Op: "!=", Threshold: 1000, Level: "warning"},
			true,
		},
		{
			"empty level",
			AlertRule{Metric: "latency_p99", Op: ">", Threshold: 1000, Level: ""},
			true,
		},
		{
			"invalid level",
			AlertRule{Metric: "latency_p99", Op: ">", Threshold: 1000, Level: "info"},
			true,
		},
		{
			"less than op",
			AlertRule{Metric: "error_rate", Op: "<", Threshold: 0.5, Level: "critical"},
			false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.rule.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestConfigWithRules(t *testing.T) {
	cfg := DefaultConfig()
	cfg.AlertRules = []AlertRule{
		{Metric: "latency_p99", Op: ">", Threshold: 1000, Level: "warning"},
		{Metric: "error_rate", Op: ">", Threshold: 0.1, Level: "critical"},
	}
	if err := cfg.Validate(); err != nil {
		t.Errorf("valid config with rules: %v", err)
	}
}

func TestConfigWithInvalidRule(t *testing.T) {
	cfg := DefaultConfig()
	cfg.AlertRules = []AlertRule{
		{Metric: "latency_p99", Op: ">", Threshold: 1000, Level: "warning"},
		{Metric: "", Op: ">", Threshold: 0.1, Level: "critical"}, // invalid
	}
	if err := cfg.Validate(); err == nil {
		t.Error("expected error for config with invalid rule")
	}
}
