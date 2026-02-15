package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/greynewell/mist-go/cli"
	"github.com/greynewell/tokentrace"
)

func main() {
	app := cli.NewApp("tokentrace", "0.1.0")

	serve := &cli.Command{
		Name:  "serve",
		Usage: "Start the TokenTrace observability server",
	}
	serve.AddStringFlag("addr", ":8700", "Listen address")
	serve.AddIntFlag("max-spans", 100000, "Maximum spans to store in ring buffer")
	serve.Run = func(cmd *cli.Command, args []string) error {
		cfg := tokentrace.DefaultConfig()
		cfg.Addr = cmd.GetString("addr")
		cfg.MaxSpans = cmd.GetInt("max-spans")

		if err := cfg.Validate(); err != nil {
			return err
		}

		h := tokentrace.NewHandler(cfg)
		mux := http.NewServeMux()
		mux.HandleFunc("POST /mist", h.Ingest)
		mux.HandleFunc("GET /traces", h.Traces)
		mux.HandleFunc("GET /traces/recent", h.RecentSpans)
		mux.HandleFunc("GET /traces/", h.TraceByID)
		mux.HandleFunc("GET /stats", h.StatsHandler)

		fmt.Printf("tokentrace listening on %s\n", cfg.Addr)
		return http.ListenAndServe(cfg.Addr, mux)
	}
	app.AddCommand(serve)

	if err := app.Execute(os.Args[1:]); err != nil {
		os.Exit(1)
	}
}
