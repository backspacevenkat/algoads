#!/usr/bin/env python3
"""
AlgoAds MCP server.

Exposes the AlgoAds HTTP API as MCP tools so any MCP-compatible client
(Claude Code, Cursor, Windsurf, Zed, Gemini) can drive retention-safe
Demand Gen campaigns via chat.

Uses the public `mcp` Python SDK (install with `pip install mcp httpx`).

Setup:
1. Install: `pip install mcp httpx`
2. Set env vars:
     export ALGOADS_BASE_URL=https://algoads.vercel.app
     # or http://localhost:3000 for dev
     export ALGOADS_API_TOKEN=<vercel-bypass-token-if-protection-enabled>
3. Register with Claude Code:
     claude mcp add algoads python3 /path/to/mcp/algoads_mcp.py

Tools exposed:
- list_campaigns
- get_campaign
- get_campaign_metrics
- generate_creative
- enable_campaign
- pause_campaign
- delete_campaign
"""
import os
import sys
import json
import asyncio
from typing import Any

try:
    import httpx
    from mcp.server import Server, NotificationOptions
    from mcp.server.stdio import stdio_server
    from mcp.types import Tool, TextContent
except ImportError:
    sys.stderr.write(
        "Missing dependencies. Install with:\n  pip install mcp httpx\n"
    )
    sys.exit(1)


BASE_URL = os.environ.get("ALGOADS_BASE_URL", "http://localhost:3000").rstrip("/")
API_TOKEN = os.environ.get("ALGOADS_API_TOKEN", "")

_client: httpx.AsyncClient | None = None


def get_client() -> httpx.AsyncClient:
    """Lazily build an HTTP client with auth headers."""
    global _client
    if _client is None:
        headers: dict[str, str] = {"Content-Type": "application/json"}
        if API_TOKEN:
            # Vercel protection bypass — works for both bearer tokens and
            # the x-vercel-protection-bypass header style.
            headers["Authorization"] = f"Bearer {API_TOKEN}"
            headers["x-vercel-protection-bypass"] = API_TOKEN
        _client = httpx.AsyncClient(
            base_url=BASE_URL,
            headers=headers,
            timeout=httpx.Timeout(120.0),
        )
    return _client


async def api_get(path: str) -> dict[str, Any]:
    resp = await get_client().get(path)
    resp.raise_for_status()
    return resp.json()


async def api_post(path: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
    resp = await get_client().post(path, json=body or {})
    resp.raise_for_status()
    return resp.json()


async def api_delete(path: str) -> dict[str, Any]:
    resp = await get_client().delete(path)
    resp.raise_for_status()
    return resp.json()


# ─── MCP server setup ────────────────────────────────────────────────
server = Server("algoads")


@server.list_tools()
async def list_tools() -> list[Tool]:
    """Advertise the available tools to MCP clients."""
    return [
        Tool(
            name="list_campaigns",
            description=(
                "List all non-removed Google Ads campaigns with 7-day performance "
                "metrics. Returns campaigns with impressions, clicks, CTR, spend, and "
                "retention quartiles. Use this to see what's running and how it's performing."
            ),
            inputSchema={"type": "object", "properties": {}, "additionalProperties": False},
        ),
        Tool(
            name="get_campaign",
            description=(
                "Get detailed diagnostic for a single campaign — ad groups, ads with "
                "approval status, targeting counts (geos, languages), and budget. "
                "Use this to debug a specific campaign."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "campaign_id": {"type": "string", "description": "Google Ads campaign ID"},
                },
                "required": ["campaign_id"],
                "additionalProperties": False,
            },
        ),
        Tool(
            name="get_campaign_metrics",
            description=(
                "Fetch daily metrics breakdown for a campaign over the last N days. "
                "Returns date, impressions, clicks, views, cost, CTR per day. "
                "Use this to track performance trends."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "campaign_id": {"type": "string"},
                    "days": {"type": "number", "enum": [7, 14, 30], "default": 14},
                },
                "required": ["campaign_id"],
                "additionalProperties": False,
            },
        ),
        Tool(
            name="generate_creative",
            description=(
                "Use Gemini to auto-generate Demand Gen ad copy (5 headlines, 3 long "
                "headlines, 3 descriptions) from a YouTube URL. Returns video metadata "
                "plus the generated creative ready for launch_campaign."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "youtube_url": {
                        "type": "string",
                        "description": "YouTube video URL or 11-character video ID",
                    },
                    "brand_hint": {
                        "type": "string",
                        "description": "Optional angle/audience description to steer the AI",
                    },
                },
                "required": ["youtube_url"],
                "additionalProperties": False,
            },
        ),
        Tool(
            name="enable_campaign",
            description="Enable (start serving) a paused campaign.",
            inputSchema={
                "type": "object",
                "properties": {"campaign_id": {"type": "string"}},
                "required": ["campaign_id"],
                "additionalProperties": False,
            },
        ),
        Tool(
            name="pause_campaign",
            description="Pause a running campaign. Stops serving but keeps all settings.",
            inputSchema={
                "type": "object",
                "properties": {"campaign_id": {"type": "string"}},
                "required": ["campaign_id"],
                "additionalProperties": False,
            },
        ),
        Tool(
            name="delete_campaign",
            description=(
                "Delete a campaign permanently. Irreversible. Legacy VIDEO campaigns "
                "cannot be deleted via API — use the Google Ads UI for those."
            ),
            inputSchema={
                "type": "object",
                "properties": {"campaign_id": {"type": "string"}},
                "required": ["campaign_id"],
                "additionalProperties": False,
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    """Dispatch tool calls to the right API endpoint."""
    try:
        if name == "list_campaigns":
            data = await api_get("/api/campaigns")
        elif name == "get_campaign":
            cid = arguments["campaign_id"]
            data = await api_get(f"/api/campaigns/{cid}")
        elif name == "get_campaign_metrics":
            cid = arguments["campaign_id"]
            days = arguments.get("days", 14)
            data = await api_get(f"/api/campaigns/{cid}/metrics?days={days}")
        elif name == "generate_creative":
            data = await api_post(
                "/api/creative/generate",
                {
                    "url": arguments["youtube_url"],
                    "brandHint": arguments.get("brand_hint"),
                },
            )
        elif name == "enable_campaign":
            cid = arguments["campaign_id"]
            data = await api_post(f"/api/campaigns/{cid}/enable")
        elif name == "pause_campaign":
            cid = arguments["campaign_id"]
            data = await api_post(f"/api/campaigns/{cid}/pause")
        elif name == "delete_campaign":
            cid = arguments["campaign_id"]
            data = await api_delete(f"/api/campaigns/{cid}")
        else:
            return [TextContent(type="text", text=f"Unknown tool: {name}")]

        return [TextContent(type="text", text=json.dumps(data, indent=2))]

    except httpx.HTTPStatusError as e:
        body = e.response.text[:1500] if e.response else "(no body)"
        return [
            TextContent(
                type="text",
                text=f"HTTP {e.response.status_code} from AlgoAds API:\n{body}",
            )
        ]
    except Exception as e:
        return [TextContent(type="text", text=f"Error calling {name}: {e}")]


async def main() -> None:
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(
                notification_options=NotificationOptions(),
                experimental_capabilities={},
            ),
        )


if __name__ == "__main__":
    asyncio.run(main())
