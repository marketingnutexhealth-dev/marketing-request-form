const ASANA_API_BASE = "https://app.asana.com/api/1.0";

const token = process.env.ASANA_ACCESS_TOKEN;
const facilityFieldGid = process.env.ASANA_FACILITY_FIELD_GID;

if (!token || !facilityFieldGid) {
    console.error(
        "Missing ASANA_ACCESS_TOKEN or ASANA_FACILITY_FIELD_GID in .env.local",
    );
    process.exit(1);
}

const FACILITIES = [
    "Albuquerque ER & Hospital- West",
    "Albuquerque ER & Hospital- East",
    "Alexandria Emergency Hospital",
    "Archview ER & Hospital",
    "Bayou City ER & Hospital",
    "Cabot Emergency Hospital",
    "Covington Trace ER & Hospital",
    "East Valley ER & Hospital",
    "East Valley ER-Chandler",
    "Fort Smith ER & Hospital",
    "Green Bay ER & Hospital",
    "Jacksonville ER & Hospital",
    "Milwaukee ER & Hospital",
    "New Braunfels ER & Hospital",
    "NW Indiana ER & Hospital",
    "Oklahoma ER & Hospital",
    "Post Falls ER & Hospital",
    "Red River ER & Hospital",
    "Royse City Emergency Hospital",
    "San Antonio ER & Hospital",
    "Starkey Ranch ER & Hospital",
    "Texarkana Emergency Center & Hospital",
    "The Colony ER Hospital",
    "West Little Rock Emergency Room",
    "West Plano Emergency Room",
    "Wylie ER",
    "Topeka ER & Hospital",
    "Tucson ER & Hospital",
    "Tulsa ER & Hospital",
];

async function asanaRequest(path, options = {}) {
    const response = await fetch(`${ASANA_API_BASE}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    const result = await response.json();

    if (!response.ok) {
        const message =
            result.errors?.map((error) => error.message).join("; ") ||
            `Asana returned HTTP ${response.status}`;

        throw new Error(message);
    }

    return result.data;
}

async function main() {
    console.log("Reading existing Facility options...");

    const customField = await asanaRequest(
        `/custom_fields/${facilityFieldGid}?opt_fields=gid,name,enum_options.gid,enum_options.name,enum_options.enabled`,
    );

    const existingNames = new Set(
        (customField.enum_options ?? []).map((option) =>
            option.name.trim().toLowerCase(),
        ),
    );

    let added = 0;
    let skipped = 0;

    for (const rawName of FACILITIES) {
        const name = rawName.trim().replace(/\s+/g, " ");
        const normalizedName = name.toLowerCase();

        if (existingNames.has(normalizedName)) {
            console.log(`SKIPPED: ${name}`);
            skipped += 1;
            continue;
        }

        await asanaRequest(`/custom_fields/${facilityFieldGid}/enum_options`, {
            method: "POST",
            body: JSON.stringify({
                data: {
                    name,
                    enabled: true,
                },
            }),
        });

        existingNames.add(normalizedName);
        added += 1;

        console.log(`ADDED: ${name}`);
    }

    console.log("");
    console.log("Facility import complete.");
    console.log(`Added: ${added}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Total requested: ${FACILITIES.length}`);
}

main().catch((error) => {
    console.error("");
    console.error("Facility import failed:");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
