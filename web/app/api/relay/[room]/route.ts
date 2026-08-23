import { NextRequest, NextResponse } from "next/server";

interface RelayMessage {
  id: string;
  url: string;
  preset_id?: string;
  title?: string;
  auto_start?: boolean;
  timestamp: number;
}

// In-memory room message storage (Ephemeral, 60s TTL)
declare global {
  // eslint-disable-next-line no-var
  var __downlink_relay_rooms: Map<string, RelayMessage[]> | undefined;
}

const rooms = globalThis.__downlink_relay_rooms || new Map<string, RelayMessage[]>();
globalThis.__downlink_relay_rooms = rooms;

// Clean up stale rooms every 30 seconds
function purgeStaleMessages() {
  const now = Date.now();
  const maxAge = 60 * 1000; // 60 seconds

  for (const [room, messages] of rooms.entries()) {
    const valid = messages.filter((m) => now - m.timestamp < maxAge);
    if (valid.length === 0) {
      rooms.delete(room);
    } else {
      rooms.set(room, valid);
    }
  }
}

// POST /api/relay/[room] -> Phone sends a download link
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ room: string }> }
) {
  const { room } = await context.params;
  const cleanRoom = room.trim().toUpperCase();

  try {
    const body = await req.json();
    if (!body.url || typeof body.url !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid URL" },
        { status: 400, headers: corsHeaders() }
      );
    }

    purgeStaleMessages();

    const message: RelayMessage = {
      id: crypto.randomUUID(),
      url: body.url.trim(),
      preset_id: body.preset_id || "recommended_best",
      title: body.title,
      auto_start: body.auto_start ?? true,
      timestamp: Date.now(),
    };

    const currentList = rooms.get(cleanRoom) || [];
    currentList.push(message);
    rooms.set(cleanRoom, currentList);

    return NextResponse.json(
      {
        success: true,
        message: `Queued download for room ${cleanRoom}`,
        room: cleanRoom,
        id: message.id,
      },
      { status: 200, headers: corsHeaders() }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal Error" },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// GET /api/relay/[room] (or /api/relay/[room]?poll=1) -> Desktop app consumes pending links
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ room: string }> }
) {
  const { room } = await context.params;
  const cleanRoom = room.trim().toUpperCase();

  purgeStaleMessages();

  const pending = rooms.get(cleanRoom) || [];
  
  // Drain the queue upon desktop receipt
  rooms.delete(cleanRoom);

  return NextResponse.json(pending, {
    status: 200,
    headers: corsHeaders(),
  });
}

// OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
