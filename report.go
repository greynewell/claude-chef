package tokentrace

import (
	"context"
	"sync"

	"github.com/greynewell/mist-go/protocol"
	"github.com/greynewell/mist-go/trace"
	"github.com/greynewell/mist-go/transport"
)

// Reporter sends trace spans to a TokenTrace server. It is safe for
// concurrent use. If the TokenTrace URL is empty, spans are silently
// discarded (no-op mode).
type Reporter struct {
	source string
	tr     transport.Sender

	mu      sync.Mutex
	dropped int64
}

// NewReporter creates a reporter that sends spans to the given TokenTrace URL.
// If url is empty, the reporter operates in no-op mode.
func NewReporter(source, url string) *Reporter {
	r := &Reporter{source: source}
	if url != "" {
		r.tr = transport.NewHTTP(url + "/mist")
	}
	return r
}

// Report sends a completed span to TokenTrace. It is non-blocking: if the
// send fails, the span is silently dropped and the drop count incremented.
func (r *Reporter) Report(ctx context.Context, span *trace.Span) {
	if r.tr == nil {
		return
	}

	msg, err := trace.SpanToMessage(r.source, span)
	if err != nil {
		r.recordDrop()
		return
	}

	if err := r.tr.Send(ctx, msg); err != nil {
		r.recordDrop()
	}
}

// ReportProto sends a protocol.TraceSpan directly.
func (r *Reporter) ReportProto(ctx context.Context, span protocol.TraceSpan) {
	if r.tr == nil {
		return
	}

	msg, err := protocol.New(r.source, protocol.TypeTraceSpan, span)
	if err != nil {
		r.recordDrop()
		return
	}

	if err := r.tr.Send(ctx, msg); err != nil {
		r.recordDrop()
	}
}

// Dropped returns the number of spans that failed to send.
func (r *Reporter) Dropped() int64 {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.dropped
}

func (r *Reporter) recordDrop() {
	r.mu.Lock()
	r.dropped++
	r.mu.Unlock()
}
