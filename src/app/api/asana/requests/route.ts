import { NextRequest, NextResponse } from "next/server";

const ASANA_API_BASE = "https://app.asana.com/api/1.0";

// ---------------------------------------------------------------------------
// Team routing map — assign each deliverable to its team's person.
// These are TESTING emails; swap for real team accounts when ready.
// A team with no email here leaves its tasks unassigned (no crash).
// ---------------------------------------------------------------------------
const TEAM_EMAIL: Record<string, string> = {
    Web: "tfosque@gmail.com",
    Graphics: "tim.fosque@outlook.com",
    Social: "tim.fosque@nutexhealth.com",
    // Writing: "add-when-ready@example.com",
};

type RequesterData = {
    facility?: string;
    facilityGid?: string;
    name?: string;
    email?: string;
    role?: string;
    completionDate?: string;
};

type ValidatedRequester = {
    facility: string;
    facilityGid: string;
    name: string;
    email: string;
    role: string;
    completionDate: string;
};

type ServiceChoice = {
    id?: string;
    title?: string;
};

type ServiceFieldAnswer = {
    id?: string;
    label?: string;
    value?: string | string[];
};

type PrintItemPayload = {
    id?: string;
    title?: string;
    spec?: string;
    quantity?: string;
};

type ServicePayload = {
    id?: string;
    title?: string;
    teams?: string[];
    choices?: ServiceChoice[];
    fields?: ServiceFieldAnswer[];
    printItems?: PrintItemPayload[];
    details?: string;
};

type MarketingRequestPayload = {
    requester?: RequesterData;
    services?: ServicePayload[];
};

type AsanaTask = {
    gid: string;
    name: string;
    permalink_url?: string;
};

type AsanaUser = {
    gid: string;
};

type AsanaResponse<T> = {
    data?: T;
    errors?: Array<{
        message?: string;
        help?: string;
        phrase?: string;
    }>;
};

type Assignment = {
    assignee: string | null;
    followers: string[];
};

function getMinimumCompletionDate(): string {
    const date = new Date();

    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 5);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

function formatValue(value: unknown): string {
    if (Array.isArray(value)) {
        return value
            .map((item) => String(item).trim())
            .filter(Boolean)
            .join(", ");
    }

    if (typeof value === "string") {
        return value.trim();
    }

    if (typeof value === "number") {
        return String(value);
    }

    return "";
}

function section(title: string, lines: string[]): string {
    const filled = lines
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (filled.length === 0) {
        return "";
    }

    return `${title}\n${"-".repeat(title.length)}\n${filled.join("\n")}`;
}

function teamLabel(service: ServicePayload): string {
    const teams = (service.teams ?? []).filter(isNonEmptyString);
    return teams.length > 0 ? teams.join(" & ") : "Unassigned";
}

function subtaskName(service: ServicePayload): string {
    const title = service.title ?? "Service";
    const teams = (service.teams ?? []).filter(isNonEmptyString);
    return teams.length > 0 ? `${teams.join(" & ")} — ${title}` : title;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function buildParentHtml(
    requester: ValidatedRequester,
    services: ServicePayload[],
): string {
    const deliverables = services
        .map((service) => `<li>${escapeHtml(subtaskName(service))}</li>`)
        .join("");

    const teams = Array.from(
        new Set(
            services.flatMap((service) =>
                (service.teams ?? []).filter(isNonEmptyString),
            ),
        ),
    );

    const requesterBlock = [
        `<strong>Facility:</strong> ${escapeHtml(requester.facility)}`,
        `<strong>Name:</strong> ${escapeHtml(requester.name)}`,
        `<strong>Email:</strong> ${escapeHtml(requester.email)}`,
        `<strong>Department or Role:</strong> ${escapeHtml(requester.role)}`,
        `<strong>Requested Completion:</strong> ${escapeHtml(requester.completionDate)}`,
    ].join("\n");

    const teamsBlock =
        teams.length > 0
            ? `\n\n<strong>Teams Involved</strong>\n${escapeHtml(teams.join(", "))}`
            : "";

    return `<body><strong>Requested Deliverables</strong>\n<ul>${deliverables}</ul>\n\n<strong>Requester</strong>\n${requesterBlock}${teamsBlock}</body>`;
}

function buildServiceHtml(service: ServicePayload): string {
    const parts: string[] = [];

    const choiceTitles = (service.choices ?? [])
        .map((choice) => choice.title)
        .filter(isNonEmptyString);

    if (choiceTitles.length > 0) {
        parts.push(
            `<strong>Selected Work</strong>\n<ul>${choiceTitles
                .map((title) => `<li>${escapeHtml(title)}</li>`)
                .join("")}</ul>`,
        );
    }

    if (service.id === "print") {
        const itemLines = (service.printItems ?? []).map((item) => {
            const title = isNonEmptyString(item.title) ? item.title : "Item";
            const spec = isNonEmptyString(item.spec) ? item.spec : "—";
            const quantity = isNonEmptyString(item.quantity)
                ? item.quantity
                : "—";

            return `<li>${escapeHtml(title)}: ${escapeHtml(spec)} · Qty ${escapeHtml(quantity)}</li>`;
        });

        if (itemLines.length > 0) {
            parts.push(`<strong>Print Items</strong>\n<ul>${itemLines.join("")}</ul>`);
        }
    } else {
        const fieldLines = (service.fields ?? [])
            .map((field) => {
                const value = formatValue(field.value);
                if (!isNonEmptyString(field.label) || !value) return "";
                return `<strong>${escapeHtml(field.label)}:</strong> ${escapeHtml(value)}`;
            })
            .filter(Boolean);

        if (fieldLines.length > 0) {
            parts.push(fieldLines.join("\n"));
        }
    }

    return `<body>${parts.join("\n\n")}</body>`;
}

function validateService(
    service: ServicePayload,
    index: number,
): string | null {
    const where = isNonEmptyString(service.title)
        ? service.title
        : `Service ${index + 1}`;

    if (!isNonEmptyString(service.id) || !isNonEmptyString(service.title)) {
        return `${where}: a request type is missing.`;
    }

    if (!service.choices || service.choices.length === 0) {
        return `${where}: select at least one item.`;
    }

    if (!isNonEmptyString(service.details)) {
        return `${where}: details are required.`;
    }

    if (service.id === "print") {
        const items = service.printItems ?? [];

        if (items.length === 0) {
            return `${where}: add at least one print item.`;
        }

        const hasIncompleteItem = items.some(
            (item) =>
                !isNonEmptyString(item.spec) ||
                !isNonEmptyString(item.quantity),
        );

        if (hasIncompleteItem) {
            return `${where}: each print item needs a specification and quantity.`;
        }
    }

    return null;
}

async function loadMemberMap(
    workspaceGid: string,
    token: string,
): Promise<Map<string, string>> {
    const map = new Map<string, string>();

    try {
        const response = await fetch(
            `${ASANA_API_BASE}/workspaces/${workspaceGid}/users?opt_fields=email,gid&limit=100`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
                cache: "no-store",
            },
        );

        const result = (await response.json()) as AsanaResponse<
            Array<{ gid?: string; email?: string }>
        >;

        if (response.ok && Array.isArray(result.data)) {
            for (const member of result.data) {
                if (isNonEmptyString(member.email) && isNonEmptyString(member.gid)) {
                    map.set(member.email.trim().toLowerCase(), member.gid);
                }
            }
        }
    } catch {
        // Leave the map empty; callers degrade to unassigned.
    }

    return map;
}

function assignmentForTeams(
    teams: string[],
    memberMap: Map<string, string>,
    unresolved: Set<string>,
): Assignment {
    const gids: string[] = [];

    for (const team of teams) {
        const email = TEAM_EMAIL[team];
        if (!isNonEmptyString(email)) continue;

        const gid = memberMap.get(email.trim().toLowerCase());
        if (!gid) {
            unresolved.add(`${team} (${email})`);
            continue;
        }
        if (!gids.includes(gid)) {
            gids.push(gid);
        }
    }

    return { assignee: gids[0] ?? null, followers: gids.slice(1) };
}

async function uploadAttachment(
    taskGid: string,
    file: File,
    token: string,
): Promise<void> {
    try {
        const uploadForm = new FormData();
        uploadForm.append("parent", taskGid);
        uploadForm.append("file", file, file.name);

        await fetch(`${ASANA_API_BASE}/attachments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            body: uploadForm,
        });
    } catch {
        // A failed attachment should not fail the whole submission.
    }
}

async function setTeamField(
    taskGid: string,
    teams: string,
    fieldGid: string,
    token: string,
): Promise<void> {
    if (!isNonEmptyString(teams)) return;

    try {
        await fetch(`${ASANA_API_BASE}/tasks/${taskGid}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({
                data: { custom_fields: { [fieldGid]: teams } },
            }),
        });
    } catch {
        // A failed custom-field update should not fail the submission.
    }
}

async function postComment(
    taskGid: string,
    text: string,
    token: string,
): Promise<void> {
    try {
        await fetch(`${ASANA_API_BASE}/tasks/${taskGid}/stories`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({ data: { text } }),
        });
    } catch {
        // A failed comment should not fail the whole submission.
    }
}

async function callAsana<T>(
    path: string,
    token: string,
    init: RequestInit,
): Promise<T> {
    const response = await fetch(`${ASANA_API_BASE}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
            ...init.headers,
        },
        cache: "no-store",
    });

    const result = (await response.json()) as AsanaResponse<T>;

    if (!response.ok || !result.data) {
        const message =
            result.errors
                ?.map((error) => error.message)
                .filter(Boolean)
                .join("; ") || `Asana returned HTTP ${response.status}.`;

        throw new Error(message);
    }

    return result.data;
}

export async function POST(request: NextRequest) {
    const token = process.env.ASANA_ACCESS_TOKEN;
    const projectGid = process.env.ASANA_PROJECT_GID;
    const workspaceGid = process.env.ASANA_WORKSPACE_GID;
    const facilityFieldGid = process.env.ASANA_FACILITY_FIELD_GID;
    const teamFieldGid = process.env.ASANA_TEAM_FIELD_GID;

    if (!token || !projectGid || !workspaceGid || !facilityFieldGid) {
        return NextResponse.json(
            {
                success: false,
                error:
                    "Missing ASANA_ACCESS_TOKEN, ASANA_PROJECT_GID, ASANA_WORKSPACE_GID, or ASANA_FACILITY_FIELD_GID.",
            },
            { status: 500 },
        );
    }

    let payload: MarketingRequestPayload;
    let form: FormData;

    try {
        form = await request.formData();
        const raw = form.get("payload");
        if (typeof raw !== "string") {
            throw new Error("Missing payload.");
        }
        payload = JSON.parse(raw) as MarketingRequestPayload;
    } catch {
        return NextResponse.json(
            {
                success: false,
                error: "The request must include a valid form submission.",
            },
            { status: 400 },
        );
    }

    const requester = payload.requester;
    const services = payload.services ?? [];
    const minimumCompletionDate = getMinimumCompletionDate();

    if (
        !requester ||
        !isNonEmptyString(requester.facility) ||
        !isNonEmptyString(requester.facilityGid) ||
        !isNonEmptyString(requester.name) ||
        !isNonEmptyString(requester.email) ||
        !isNonEmptyString(requester.role) ||
        !isNonEmptyString(requester.completionDate)
    ) {
        return NextResponse.json(
            {
                success: false,
                error:
                    "Required requester information or Facility option GID is missing.",
            },
            { status: 400 },
        );
    }

    if (requester.completionDate < minimumCompletionDate) {
        return NextResponse.json(
            {
                success: false,
                error: `Requested completion date must be ${minimumCompletionDate} or later.`,
                minimumCompletionDate,
            },
            { status: 400 },
        );
    }

    if (services.length === 0) {
        return NextResponse.json(
            {
                success: false,
                error: "Add at least one service to the request.",
            },
            { status: 400 },
        );
    }

    for (let index = 0; index < services.length; index += 1) {
        const serviceError = validateService(services[index], index);

        if (serviceError) {
            return NextResponse.json(
                {
                    success: false,
                    error: serviceError,
                },
                { status: 400 },
            );
        }
    }

    const validRequester: ValidatedRequester = {
        facility: requester.facility,
        facilityGid: requester.facilityGid,
        name: requester.name,
        email: requester.email,
        role: requester.role,
        completionDate: requester.completionDate,
    };

    const allTeamNames = Array.from(
        new Set(
            services.flatMap((service) =>
                (service.teams ?? []).filter(isNonEmptyString),
            ),
        ),
    );

    const memberMap = await loadMemberMap(workspaceGid, token);
    const unresolvedTeams = new Set<string>();

    // Resolve assignment for each service, then union for the parent.
    const serviceAssignments: Assignment[] = services.map((service) =>
        assignmentForTeams(service.teams ?? [], memberMap, unresolvedTeams),
    );

    const parentFollowers: string[] = [];
    for (const assignment of serviceAssignments) {
        for (const gid of [assignment.assignee, ...assignment.followers]) {
            if (gid && !parentFollowers.includes(gid)) {
                parentFollowers.push(gid);
            }
        }
    }

    try {
        const parentData: Record<string, unknown> = {
            name: `${validRequester.facility} — ${services
                .map((service) => service.title ?? "Service")
                .join(", ")}`,
            html_notes: buildParentHtml(validRequester, services),
            due_on: validRequester.completionDate,
            workspace: workspaceGid,
            projects: [projectGid],
            custom_fields: {
                [facilityFieldGid]: validRequester.facilityGid,
            },
        };

        if (parentFollowers[0]) {
            parentData.assignee = parentFollowers[0];
        }
        if (parentFollowers.length > 0) {
            parentData.followers = parentFollowers;
        }

        const parentTask = await callAsana<AsanaTask>(
            "/tasks?opt_fields=gid,name,permalink_url",
            token,
            {
                method: "POST",
                body: JSON.stringify({ data: parentData }),
            },
        );

        if (isNonEmptyString(teamFieldGid)) {
            await setTeamField(
                parentTask.gid,
                allTeamNames.join(", "),
                teamFieldGid,
                token,
            );
        }

        const subtasks: AsanaTask[] = [];

        for (let index = 0; index < services.length; index += 1) {
            const service = services[index];
            const assignment = serviceAssignments[index];

            const subtaskData: Record<string, unknown> = {
                name: subtaskName(service),
                html_notes: buildServiceHtml(service),
                due_on: validRequester.completionDate,
                workspace: workspaceGid,
            };

            if (assignment.assignee) {
                subtaskData.assignee = assignment.assignee;
            }
            if (assignment.followers.length > 0) {
                subtaskData.followers = assignment.followers;
            }

            const subtask = await callAsana<AsanaTask>(
                `/tasks/${parentTask.gid}/subtasks?opt_fields=gid,name,permalink_url`,
                token,
                {
                    method: "POST",
                    body: JSON.stringify({ data: subtaskData }),
                },
            );

            if (isNonEmptyString(service.details)) {
                await postComment(subtask.gid, service.details, token);
            }

            const serviceId = service.id ?? "";
            const files = form
                .getAll(`file:${serviceId}`)
                .filter((entry): entry is File => typeof entry !== "string");

            for (const file of files) {
                await uploadAttachment(subtask.gid, file, token);
            }

            if (isNonEmptyString(teamFieldGid)) {
                await setTeamField(
                    subtask.gid,
                    (service.teams ?? [])
                        .filter(isNonEmptyString)
                        .join(", "),
                    teamFieldGid,
                    token,
                );
            }

            subtasks.push(subtask);
        }

        return NextResponse.json(
            {
                success: true,
                parentTask,
                subtasks,
                unresolvedTeams: Array.from(unresolvedTeams),
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("Asana request creation failed:", error);

        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to create the Asana request.",
            },
            { status: 502 },
        );
    }
}