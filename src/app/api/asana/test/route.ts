import { NextResponse } from "next/server";

const ASANA_API_BASE = "https://app.asana.com/api/1.0";

export async function GET() {
  const token = process.env.ASANA_ACCESS_TOKEN;
  const projectGid = process.env.ASANA_PROJECT_GID;

  if (!token || !projectGid) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing ASANA_ACCESS_TOKEN or ASANA_PROJECT_GID.",
      },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      `${ASANA_API_BASE}/projects/${projectGid}?opt_fields=gid,name,permalink_url`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          status: response.status,
          asanaError: result,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      project: result.data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
