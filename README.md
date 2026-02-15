# tokentrace

Token-level observability for the MIST stack. Ingest trace spans, compute real-time metrics, and alert on threshold breaches.

[![Go](https://img.shields.io/badge/Go-1.24+-00ADD8?logo=go&logoColor=white)](https://go.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

TokenTrace collects trace spans from MIST stack tools, aggregates metrics in real time, and fires alerts when thresholds are breached.

- **Span store** — fixed-capacity ring buffer with trace ID indexing
- **Aggregator** — latency percentiles, error rates, token counts, cost tracking
- **Alerter** — configurable threshold rules with cooldown suppression
- **HTTP API** — ingest via MIST protocol, query traces/stats

## Install

```bash
go get github.com/greynewell/tokentrace
```

## Usage

### Start the server

```bash
go run ./cmd/tokentrace serve --addr :8700 --max-spans 100000
```

### Ingest spans

```go
reporter := tokentrace.NewReporter("myapp", "http://localhost:8700")
reporter.Report(ctx, span)
```

### Query traces

```bash
curl http://localhost:8700/traces                  # List trace IDs
curl http://localhost:8700/traces/recent?limit=10  # Recent spans
curl http://localhost:8700/traces/{trace-id}       # Spans by trace
curl http://localhost:8700/stats                   # Aggregated metrics
```

### Configure alerts

```go
cfg := tokentrace.Config{
    Addr:          ":8700",
    MaxSpans:      100_000,
    AlertCooldown: 5 * time.Minute,
    AlertRules: []tokentrace.AlertRule{
        {Metric: "error_rate", Op: ">", Threshold: 0.05, Level: "warning"},
        {Metric: "latency_p99", Op: ">", Threshold: 5000, Level: "critical"},
    },
}
h := tokentrace.NewHandler(cfg)
```

## Metrics

| Metric | Description |
|--------|-------------|
| `total_spans` | Total spans ingested |
| `error_count` | Spans with error status |
| `error_rate` | Error count / total spans |
| `latency_p50_ms` | Median span latency |
| `latency_p99_ms` | 99th percentile latency |
| `total_tokens_in` | Sum of input tokens |
| `total_tokens_out` | Sum of output tokens |
| `total_cost_usd` | Cumulative inference cost |

## Part of the MIST stack

| Tool | Purpose |
|------|---------|
| **MatchSpec** | Evaluation framework |
| **InferMux** | Inference routing across providers |
| **SchemaFlux** | Structured data compiler |
| **TokenTrace** | Token-level observability (this repo) |

Shared foundation: [mist-go](https://github.com/greynewell/mist-go)

## License

MIT — see [LICENSE](LICENSE) for details.

---

Built by [Grey Newell](https://greynewell.com) | [tokentrace.dev](https://tokentrace.dev)
