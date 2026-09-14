import { NextResponse } from "next/server";

const ASANA_API_BASE = "https://app.asana.com/api/1.0";

export async function GET() {
    const token = process.env.ASANA_ACCESS_TOKEN;
    const projectGid = process.env.ASANA_PROJECT_GID;

    if (!token || !projectGid) {
        return NextResponse.json(
            {
                success: false,
                error: "Missing Asana environment variables.",
            },
            { status: 500 },
        );
    }

    const fields = [
        "custom_field.gid",
        "custom_field.name",
        "custom_field.resource_subtype",
        "custom_field.enum_options.gid",
        "custom_field.enum_options.name",
        "custom_field.enum_options.enabled",
    ].join(",");

    try {
        const response = await fetch(
            `${ASANA_API_BASE}/projects/${projectGid}/custom_field_settings?opt_fields=${fields}`,
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
                    asanaError: result,
                },
                { status: response.status },
            );
        }

        return NextResponse.json({
            success: true,
            fields: result.data,
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to retrieve Asana custom fields.",
            },
            { status: 500 },
        );
    }
}