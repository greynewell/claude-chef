package tokentrace

import (
	"context"
	"testing"

	"github.com/greynewell/mist-go/trace"
)

func TestReporterNoOp(t *testing.T) {
	r := NewReporter("test", "")
	ctx, span := trace.Start(context.Background(), "test-op")
	span.End("ok")

	// Should not panic or error.
	r.Report(ctx, span)

	if r.Dropped() != 0 {
		t.Errorf("no-op reporter should have 0 drops, got %d", r.Dropped())
	}
}

func TestReporterDropsOnBadURL(t *testing.T) {
	// Point at a URL that will refuse connections.
	r := NewReporter("test", "http://127.0.0.1:1")

	ctx, span := trace.Start(context.Background(), "test-op")
	span.End("ok")
	r.Report(ctx, span)

	if r.Dropped() != 1 {
		t.Errorf("expected 1 drop, got %d", r.Dropped())
	}
}
