import { NextResponse } from "next/server";

const ASANA_API_BASE = "https://app.asana.com/api/1.0";

type FacilityOption = {
    gid: string;
    name: string;
    enabled: boolean;
};

type AsanaCustomFieldResponse = {
    data?: {
        gid: string;
        name: string;
        resource_subtype: string;
        enum_options?: FacilityOption[];
    };
    errors?: Array<{
        message?: string;
    }>;
};

export async function GET() {
    const token = process.env.ASANA_ACCESS_TOKEN;
    const facilityFieldGid = process.env.ASANA_FACILITY_FIELD_GID;

    if (!token || !facilityFieldGid) {
        return NextResponse.json(
            {
                success: false,
                error:
                    "Missing ASANA_ACCESS_TOKEN or ASANA_FACILITY_FIELD_GID.",
            },
            { status: 500 },
        );
    }

    try {
        const fields = [
            "gid",
            "name",
            "resource_subtype",
            "enum_options.gid",
            "enum_options.name",
            "enum_options.enabled",
        ].join(",");

        const response = await fetch(
            `${ASANA_API_BASE}/custom_fields/${facilityFieldGid}?opt_fields=${fields}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
                cache: "no-store",
            },
        );

        const result =
            (await response.json()) as AsanaCustomFieldResponse;

        if (!response.ok || !result.data) {
            const message =
                result.errors
                    ?.map((error) => error.message)
                    .filter(Boolean)
                    .join("; ") ||
                `Asana returned HTTP ${response.status}.`;

            return NextResponse.json(
                {
                    success: false,
                    error: message,
                },
                { status: response.status },
            );
        }

        const facilities = (result.data.enum_options ?? [])
            .filter((option) => option.enabled)
            .map((option) => ({
                gid: option.gid,
                name: option.name.trim(),
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json({
            success: true,
            facilities,
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to load facilities.",
            },
            { status: 500 },
        );
    }
}