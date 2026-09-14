"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Container, Form, Row } from "react-bootstrap";

type Screen =
    | "requester"
    | "request-options"
    | "service-details"
    | "review"
    | "confirmation";

type SubmitState = "idle" | "submitting" | "success" | "error";

type FacilityOption = {
    gid: string;
    name: string;
};

type RequesterForm = {
    facility: string;
    facilityGid: string;
    name: string;
    email: string;
    role: string;
    completionDate: string;
};

type Choice = {
    id: string;
    title: string;
    icon: string;
};

type FieldOption = {
    value: string;
    label: string;
};

type ServiceField = {
    id: string;
    label: string;
    type: "checkbox" | "radio" | "select" | "text" | "date";
    options?: FieldOption[];
    placeholder?: string;
    helpText?: string;
    required?: boolean;
    showWhen?: {
        field: string;
        includes: string;
    };
};

type ServiceConfig = {
    id: string;
    title: string;
    description: string;
    icon: string;
    choices: Choice[];
    fields: ServiceField[];
    detailsHelp: string;
    teams: string[];
};

type ServiceAnswers = Record<string, string | string[]>;

type PrintItemConfig = {
    dimensions: string;
    customDimensions: string;
    quantity: string;
};

type ServiceFormState = {
    choiceIds: string[];
    answers: ServiceAnswers;
    details: string;
    printItems: Record<string, PrintItemConfig>;
    files: File[];
};

const REQUEST_OPTIONS: ServiceConfig[] = [
    {
        id: "print",
        title: "Print",
        description: "Printed marketing materials and collateral.",
        icon: "bi-printer",
        teams: ["Graphics"],
        choices: [
            { id: "flyer", title: "Flyer", icon: "bi-file-earmark-richtext" },
            { id: "brochure", title: "Brochure", icon: "bi-journal-text" },
            {
                id: "banner-graphic",
                title: "Banner Graphic",
                icon: "bi-card-image",
            },
            {
                id: "large-graphic",
                title: "Large Graphic",
                icon: "bi-aspect-ratio",
            },
            {
                id: "web-support-graphics",
                title: "Web Support Graphics",
                icon: "bi-window",
            },
            { id: "other", title: "Other", icon: "bi-question-circle" },
        ],
        fields: [
            {
                id: "dimensions",
                label: "Dimensions",
                type: "select",
                required: true,
                options: [
                    { value: "8 x 10", label: "8 × 10" },
                    { value: "10 x 12", label: "10 × 12" },
                    { value: "11 x 14", label: "11 × 14" },
                    { value: "11 x 17", label: "11 × 17" },
                    { value: "custom", label: "Custom size" },
                ],
                helpText: "Choose a standard size or select Custom size.",
            },
            {
                id: "customDimensions",
                label: "Custom dimensions",
                type: "text",
                placeholder: "Example: 12 × 18",
                required: true,
                showWhen: { field: "dimensions", includes: "custom" },
            },
            {
                id: "quantity",
                label: "Quantity",
                type: "text",
                placeholder: "Example: 250",
            },
        ],
        detailsHelp:
            "Describe what you need, including audience, messaging, quantity, deadline, and any existing materials.",
    },
    {
        id: "social-personal",
        title: "Social Personal Post / Video or Ad",
        description: "Personalized social content, video, or advertising.",
        icon: "bi-person-video3",
        teams: ["Social"],
        choices: [
            {
                id: "new-social-post",
                title: "New Social Post",
                icon: "bi-chat-square-text",
            },
            { id: "social-video", title: "Social Video", icon: "bi-play-btn" },
            { id: "social-ad", title: "Social Ad", icon: "bi-megaphone" },
            {
                id: "update-existing",
                title: "Update Existing",
                icon: "bi-arrow-repeat",
            },
            {
                id: "reuse-existing",
                title: "Reuse Existing",
                icon: "bi-layers",
            },
            { id: "other", title: "Other", icon: "bi-question-circle" },
        ],
        fields: [
            {
                id: "platforms",
                label: "Platform / Placement",
                type: "checkbox",
                required: true,
                options: [
                    { value: "Facebook", label: "Facebook" },
                    { value: "Instagram", label: "Instagram" },
                    { value: "LinkedIn", label: "LinkedIn" },
                    { value: "TikTok", label: "TikTok" },
                    { value: "YouTube", label: "YouTube" },
                    { value: "Other", label: "Other" },
                ],
            },
            {
                id: "format",
                label: "Format",
                type: "radio",
                required: true,
                options: [
                    { value: "Image", label: "Image" },
                    { value: "Short Video", label: "Short Video (15–60 sec)" },
                    { value: "Video", label: "Video (60+ sec)" },
                    { value: "Carousel", label: "Carousel / Multi-Image" },
                ],
            },
            {
                id: "aspectRatio",
                label: "Dimensions / Aspect Ratio",
                type: "select",
                options: [
                    { value: "1:1", label: "1:1 Square — 1080 × 1080" },
                    { value: "4:5", label: "4:5 Portrait — 1080 × 1350" },
                    { value: "9:16", label: "9:16 Story / Reel" },
                    { value: "16:9", label: "16:9 Landscape" },
                    { value: "custom", label: "Custom" },
                ],
            },
        ],
        detailsHelp:
            "Describe the goal, audience, key message, tone, timing, and any existing materials or links.",
    },
    {
        id: "social-graphic",
        title: "Social Graphic",
        description: "Graphic content created for social media.",
        icon: "bi-image",
        teams: ["Graphics"],
        choices: [
            {
                id: "single-graphic",
                title: "Single Graphic Post",
                icon: "bi-image",
            },
            {
                id: "carousel",
                title: "Carousel / Multi-Image",
                icon: "bi-images",
            },
            { id: "story", title: "Story Graphic", icon: "bi-phone" },
            {
                id: "cover-header",
                title: "Cover / Header Graphic",
                icon: "bi-card-image",
            },
            {
                id: "update-existing",
                title: "Update Existing",
                icon: "bi-arrow-repeat",
            },
            { id: "other", title: "Other", icon: "bi-question-circle" },
        ],
        fields: [
            {
                id: "platforms",
                label: "Platform / Placement",
                type: "checkbox",
                required: true,
                options: [
                    { value: "Facebook", label: "Facebook" },
                    { value: "Instagram", label: "Instagram" },
                    { value: "LinkedIn", label: "LinkedIn" },
                    { value: "TikTok", label: "TikTok" },
                    { value: "X", label: "X" },
                    { value: "Other", label: "Other" },
                ],
            },
            {
                id: "format",
                label: "Format",
                type: "radio",
                required: true,
                options: [
                    { value: "Static Graphic", label: "Static Graphic" },
                    { value: "Carousel", label: "Carousel" },
                    { value: "Story", label: "Story" },
                    { value: "Header / Banner", label: "Header / Banner" },
                ],
            },
            {
                id: "aspectRatio",
                label: "Dimensions / Aspect Ratio",
                type: "select",
                options: [
                    { value: "1:1", label: "1:1 — 1080 × 1080" },
                    { value: "4:5", label: "4:5 — 1080 × 1350" },
                    { value: "9:16", label: "9:16 Story" },
                    { value: "16:9", label: "16:9 Header" },
                    { value: "custom", label: "Custom" },
                ],
            },
        ],
        detailsHelp:
            "Describe the audience, message, call to action, timing, and any existing brand assets that should be used.",
    },
    {
        id: "commercial-video",
        title: "Commercial Video or Animation",
        description: "Produced commercial video or animated content.",
        icon: "bi-camera-reels",
        teams: ["Graphics"],
        choices: [
            {
                id: "commercial-video",
                title: "Commercial Video",
                icon: "bi-film",
            },
            {
                id: "animation",
                title: "Animation / Motion Graphic",
                icon: "bi-display",
            },
            {
                id: "update-existing",
                title: "Update Existing Video",
                icon: "bi-arrow-repeat",
            },
            {
                id: "cutdown",
                title: "Video Cutdown / Edit",
                icon: "bi-scissors",
            },
            { id: "voiceover", title: "Voiceover Support", icon: "bi-mic" },
            { id: "other", title: "Other", icon: "bi-question-circle" },
        ],
        fields: [
            {
                id: "placement",
                label: "Usage / Placement",
                type: "checkbox",
                required: true,
                options: [
                    { value: "Website", label: "Website" },
                    { value: "Social Media", label: "Social Media" },
                    {
                        value: "Waiting Room / Internal Screen",
                        label: "Waiting Room / Internal Screen",
                    },
                    { value: "Paid Campaign", label: "Paid Campaign" },
                    { value: "Recruitment", label: "Recruitment" },
                    { value: "Other", label: "Other" },
                ],
            },
            {
                id: "deliverableType",
                label: "Deliverable Type",
                type: "radio",
                required: true,
                options: [
                    { value: "Video", label: "Video" },
                    { value: "Animation", label: "Animation" },
                    { value: "Both", label: "Both" },
                ],
            },
            {
                id: "estimatedLength",
                label: "Estimated Length",
                type: "select",
                options: [
                    { value: "15 seconds", label: "15 seconds" },
                    { value: "30 seconds", label: "30 seconds" },
                    { value: "60 seconds", label: "60 seconds" },
                    { value: "1–3 minutes", label: "1–3 minutes" },
                    { value: "3+ minutes", label: "3+ minutes" },
                ],
            },
        ],
        detailsHelp:
            "Describe the audience, goal, script status, desired tone, deadline, and any existing footage or assets.",
    },
    {
        id: "digital-ads",
        title: "Digital Ads",
        description: "Digital advertising, including Google and audio.",
        icon: "bi-badge-ad",
        teams: ["Writing", "Graphics"],
        choices: [
            {
                id: "google-search",
                title: "Google Search Ad",
                icon: "bi-search",
            },
            { id: "display-ad", title: "Display Ad", icon: "bi-window" },
            { id: "audio-ad", title: "Audio Ad", icon: "bi-volume-up" },
            { id: "retargeting", title: "Retargeting", icon: "bi-bullseye" },
            {
                id: "update-existing",
                title: "Update Existing Campaign",
                icon: "bi-arrow-repeat",
            },
            { id: "other", title: "Other", icon: "bi-question-circle" },
        ],
        fields: [
            {
                id: "channels",
                label: "Channel / Placement",
                type: "checkbox",
                required: true,
                options: [
                    { value: "Google", label: "Google" },
                    { value: "Audio", label: "Audio" },
                    { value: "Display Network", label: "Display Network" },
                    { value: "YouTube", label: "YouTube" },
                    { value: "Streaming", label: "Streaming" },
                    { value: "Other", label: "Other" },
                ],
            },
            {
                id: "goal",
                label: "Goal",
                type: "radio",
                required: true,
                options: [
                    { value: "Awareness", label: "Awareness" },
                    { value: "Traffic", label: "Traffic" },
                    { value: "Leads", label: "Leads" },
                    { value: "Recruitment", label: "Recruitment" },
                ],
            },
            {
                id: "budgetRange",
                label: "Budget Range",
                type: "select",
                options: [
                    { value: "Under $500", label: "Under $500" },
                    { value: "$500–$1,500", label: "$500–$1,500" },
                    { value: "$1,500–$5,000", label: "$1,500–$5,000" },
                    { value: "$5,000+", label: "$5,000+" },
                    {
                        value: "Not yet determined",
                        label: "Not yet determined",
                    },
                ],
            },
        ],
        detailsHelp:
            "Describe the target audience, geography, timing, offer, landing page, and any existing campaign assets.",
    },
    {
        id: "new-photography",
        title: "New Photography",
        description: "New facility, provider, staff, or event photography.",
        icon: "bi-camera",
        teams: ["Graphics"],
        choices: [
            {
                id: "provider-headshots",
                title: "Provider Headshots",
                icon: "bi-person",
            },
            {
                id: "facility",
                title: "Facility Photography",
                icon: "bi-building",
            },
            {
                id: "event",
                title: "Event Photography",
                icon: "bi-calendar-event",
            },
            {
                id: "team-group",
                title: "Team / Group Photo",
                icon: "bi-people",
            },
            {
                id: "update-existing",
                title: "Update Existing",
                icon: "bi-arrow-repeat",
            },
            { id: "other", title: "Other", icon: "bi-question-circle" },
        ],
        fields: [
            {
                id: "coverage",
                label: "Subject / Coverage Needed",
                type: "checkbox",
                required: true,
                options: [
                    { value: "Providers", label: "Providers" },
                    { value: "Staff", label: "Staff" },
                    { value: "Facility", label: "Facility" },
                    {
                        value: "Patients / Community",
                        label: "Patients / Community",
                    },
                    { value: "Event", label: "Event" },
                    { value: "Other", label: "Other" },
                ],
            },
            {
                id: "sessionLocation",
                label: "Session Location",
                type: "radio",
                required: true,
                options: [
                    { value: "On-site", label: "On-site" },
                    { value: "Off-site", label: "Off-site" },
                    { value: "To Be Determined", label: "To Be Determined" },
                ],
            },
            {
                id: "preferredTiming",
                label: "Preferred Date / Timing",
                type: "radio",
                options: [
                    { value: "Soonest Available", label: "Soonest Available" },
                    { value: "Specific Date", label: "Specific Date" },
                    { value: "Flexible", label: "Flexible" },
                    { value: "After Hours", label: "After Hours" },
                ],
            },
            {
                id: "specificDate",
                label: "Specific Date",
                type: "date",
                showWhen: {
                    field: "preferredTiming",
                    includes: "Specific Date",
                },
            },
        ],
        detailsHelp:
            "Describe who or what should be photographed, intended usage, shot list, location needs, and timing.",
    },
    {
        id: "content",
        title: "Emails / Blogs / Scripts",
        description: "Written marketing and communication content.",
        icon: "bi-file-earmark-text",
        teams: ["Writing"],
        choices: [
            { id: "email", title: "Email", icon: "bi-envelope" },
            { id: "blog", title: "Blog", icon: "bi-file-text" },
            { id: "script", title: "Script", icon: "bi-chat-left-text" },
            {
                id: "update-existing",
                title: "Update Existing Content",
                icon: "bi-arrow-repeat",
            },
            { id: "repurpose", title: "Repurpose Content", icon: "bi-layers" },
            { id: "other", title: "Other", icon: "bi-question-circle" },
        ],
        fields: [
            {
                id: "contentUse",
                label: "Content Type / Use",
                type: "checkbox",
                required: true,
                options: [
                    {
                        value: "Patient Communication",
                        label: "Patient Communication",
                    },
                    { value: "Promotional", label: "Promotional" },
                    { value: "Website Content", label: "Website Content" },
                    {
                        value: "Internal Communication",
                        label: "Internal Communication",
                    },
                    { value: "Campaign Support", label: "Campaign Support" },
                    { value: "Other", label: "Other" },
                ],
            },
            {
                id: "primaryGoal",
                label: "Primary Goal",
                type: "radio",
                required: true,
                options: [
                    { value: "Inform", label: "Inform" },
                    { value: "Promote", label: "Promote" },
                    { value: "Recruit", label: "Recruit" },
                    { value: "Educate", label: "Educate" },
                ],
            },
            {
                id: "length",
                label: "Word Count / Length",
                type: "select",
                options: [
                    { value: "Short", label: "Short" },
                    { value: "Medium", label: "Medium" },
                    { value: "Long", label: "Long" },
                    { value: "Custom", label: "Custom" },
                ],
            },
        ],
        detailsHelp:
            "Describe the audience, key message, call to action, deadline, subject matter, and any source materials or links.",
    },
    {
        id: "web",
        title: "Web",
        description: "Website edits, design, and related web work.",
        icon: "bi-globe2",
        teams: ["Web"],
        choices: [
            {
                id: "page-edit",
                title: "Page Edit",
                icon: "bi-file-earmark-text",
            },
            { id: "new-page", title: "New Page", icon: "bi-file-earmark-plus" },
            { id: "design-update", title: "Design Update", icon: "bi-brush" },
            { id: "landing-page", title: "Landing Page", icon: "bi-window" },
            {
                id: "form-feature",
                title: "Form / Feature Update",
                icon: "bi-ui-checks",
            },
            { id: "other", title: "Other", icon: "bi-question-circle" },
        ],
        fields: [
            {
                id: "webRequestType",
                label: "Web Request Type",
                type: "checkbox",
                required: true,
                options: [
                    { value: "Content Edit", label: "Content Edit" },
                    { value: "Layout / Design", label: "Layout / Design" },
                    { value: "Landing Page", label: "Landing Page" },
                    { value: "SEO / Metadata", label: "SEO / Metadata" },
                    { value: "Form Update", label: "Form Update" },
                    { value: "Other", label: "Other" },
                ],
            },
            {
                id: "affectedUrl",
                label: "Affected Page / URL",
                type: "text",
                placeholder: "https://www.example.com/about",
            },
            {
                id: "priority",
                label: "Priority / Complexity",
                type: "radio",
                options: [
                    { value: "Minor Update", label: "Minor Update" },
                    { value: "Standard Request", label: "Standard Request" },
                    { value: "Larger Build", label: "Larger Build" },
                ],
            },
        ],
        detailsHelp:
            "Include the page URL(s), requested changes, content or assets needed, timing, and any approval notes.",
    },
];

function getMinimumCompletionDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 5);
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

const MAX_FILE_BYTES = 100 * 1024 * 1024;

function createEmptyServiceState(): ServiceFormState {
    return {
        choiceIds: [],
        answers: {},
        details: "",
        printItems: {},
        files: [],
    };
}

export default function HomePage() {
    const minimumCompletionDate = useMemo(() => getMinimumCompletionDate(), []);

    const [screen, setScreen] = useState<Screen>("requester");
    const [facilities, setFacilities] = useState<FacilityOption[]>([]);
    const [facilitiesLoading, setFacilitiesLoading] = useState(true);
    const [facilitiesError, setFacilitiesError] = useState("");
    const [selectedServiceId, setSelectedServiceId] = useState("");
    const [addedServiceIds, setAddedServiceIds] = useState<string[]>([]);
    const [serviceForms, setServiceForms] = useState<
        Record<string, ServiceFormState>
    >({});

    const [submitState, setSubmitState] = useState<SubmitState>("idle");
    const [submitError, setSubmitError] = useState("");
    const [submittedUrl, setSubmittedUrl] = useState("");
    const [attachmentNote, setAttachmentNote] = useState("");

    const [requester, setRequester] = useState<RequesterForm>({
        facility: "",
        facilityGid: "",
        name: "",
        email: "",
        role: "",
        completionDate: minimumCompletionDate,
    });

    const selectedService = REQUEST_OPTIONS.find(
        (service) => service.id === selectedServiceId,
    );

    const activeServiceForm = selectedServiceId
        ? (serviceForms[selectedServiceId] ?? createEmptyServiceState())
        : createEmptyServiceState();

    useEffect(() => {
        let cancelled = false;

        async function loadFacilities() {
            setFacilitiesLoading(true);
            setFacilitiesError("");

            try {
                const response = await fetch("/api/asana/facilities", {
                    cache: "no-store",
                });
                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.error || "Unable to load facilities.",
                    );
                }

                if (!cancelled) {
                    setFacilities(result.facilities ?? []);
                }
            } catch (error) {
                if (!cancelled) {
                    setFacilitiesError(
                        error instanceof Error
                            ? error.message
                            : "Unable to load facilities.",
                    );
                }
            } finally {
                if (!cancelled) {
                    setFacilitiesLoading(false);
                }
            }
        }

        loadFacilities();

        return () => {
            cancelled = true;
        };
    }, []);

    function updateRequesterField(field: keyof RequesterForm, value: string) {
        setRequester((current) => ({ ...current, [field]: value }));
    }

    function updateFacility(facilityGid: string) {
        const facility = facilities.find((item) => item.gid === facilityGid);
        setRequester((current) => ({
            ...current,
            facilityGid,
            facility: facility?.name ?? "",
        }));
    }

    function updateServiceForm(
        updater: (current: ServiceFormState) => ServiceFormState,
    ) {
        if (!selectedServiceId) return;

        setServiceForms((current) => ({
            ...current,
            [selectedServiceId]: updater(
                current[selectedServiceId] ?? createEmptyServiceState(),
            ),
        }));
    }

    function toggleChoice(choiceId: string) {
        updateServiceForm((current) => {
            const isSelected = current.choiceIds.includes(choiceId);

            return {
                ...current,
                choiceIds: isSelected
                    ? current.choiceIds.filter((id) => id !== choiceId)
                    : [...current.choiceIds, choiceId],
                printItems:
                    selectedServiceId === "print" && !isSelected
                        ? {
                            ...current.printItems,
                            [choiceId]: current.printItems[choiceId] ?? {
                                dimensions: "",
                                customDimensions: "",
                                quantity: "",
                            },
                        }
                        : current.printItems,
            };
        });
    }

    function updatePrintItem(
        choiceId: string,
        field: keyof PrintItemConfig,
        value: string,
    ) {
        updateServiceForm((current) => ({
            ...current,
            printItems: {
                ...current.printItems,
                [choiceId]: {
                    ...{ dimensions: "", customDimensions: "", quantity: "" },
                    ...current.printItems[choiceId],
                    [field]: value,
                },
            },
        }));
    }

    function updateAnswer(field: ServiceField, value: string) {
        updateServiceForm((current) => ({
            ...current,
            answers: { ...current.answers, [field.id]: value },
        }));
    }

    function toggleAnswer(field: ServiceField, value: string) {
        updateServiceForm((current) => {
            const existing = Array.isArray(current.answers[field.id])
                ? (current.answers[field.id] as string[])
                : [];

            return {
                ...current,
                answers: {
                    ...current.answers,
                    [field.id]: existing.includes(value)
                        ? existing.filter((item) => item !== value)
                        : [...existing, value],
                },
            };
        });
    }

    function shouldShowFieldFor(
        field: ServiceField,
        form: ServiceFormState,
    ): boolean {
        if (!field.showWhen) return true;
        const value = form.answers[field.showWhen.field];
        return Array.isArray(value)
            ? value.includes(field.showWhen.includes)
            : value === field.showWhen.includes;
    }

    function shouldShowField(field: ServiceField): boolean {
        return shouldShowFieldFor(field, activeServiceForm);
    }

    function isServiceFormComplete(): boolean {
        if (!selectedService) return false;
        if (activeServiceForm.choiceIds.length === 0) return false;
        if (!activeServiceForm.details.trim()) return false;

        if (selectedService.id === "print") {
            return activeServiceForm.choiceIds.every((choiceId) => {
                const item = activeServiceForm.printItems[choiceId];
                if (!item?.dimensions || !item.quantity.trim()) return false;

                return item.dimensions !== "custom"
                    ? true
                    : Boolean(item.customDimensions.trim());
            });
        }

        return selectedService.fields.every((field) => {
            if (!field.required || !shouldShowField(field)) return true;
            const value = activeServiceForm.answers[field.id];
            return Array.isArray(value)
                ? value.length > 0
                : Boolean(value?.trim());
        });
    }

    function handleRequesterSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!event.currentTarget.checkValidity()) {
            event.currentTarget.reportValidity();
            return;
        }
        setScreen("request-options");
    }

    function selectService(serviceId: string) {
        setSelectedServiceId(serviceId);
        setServiceForms((current) => ({
            ...current,
            [serviceId]: current[serviceId] ?? createEmptyServiceState(),
        }));
        setScreen("service-details");
    }

    function addServiceAndReview() {
        if (!selectedServiceId) return;

        setAddedServiceIds((current) =>
            current.includes(selectedServiceId)
                ? current
                : [...current, selectedServiceId],
        );
        setScreen("review");
    }

    function editService(serviceId: string) {
        setSelectedServiceId(serviceId);
        setScreen("service-details");
    }

    function removeService(serviceId: string) {
        const next = addedServiceIds.filter((id) => id !== serviceId);
        setAddedServiceIds(next);
        if (next.length === 0) {
            setScreen("request-options");
        }
    }

    function renderBackButton(target: Screen) {
        return (
            <button
                type="button"
                className="plain-back-button"
                onClick={() => setScreen(target)}
            >
                <i className="bi bi-arrow-left me-2" />
                Back
            </button>
        );
    }

    function renderRequesterScreen() {
        return (
            <>
                <div className="form-heading">
                    <span className="demo-label">Demo prototype</span>
                    <h1 className="page-title">Marketing request</h1>
                    <p className="page-description">
                        First, tell us who is submitting the request.
                    </p>
                </div>

                <Card className="request-card">
                    <Card.Body className="p-4 p-md-5">
                        <Form onSubmit={handleRequesterSubmit}>
                            <Row className="g-4">
                                <Col md={6}>
                                    <Form.Group controlId="facility">
                                        <Form.Label>
                                            Facility{" "}
                                            <span className="required-marker">
                                                *
                                            </span>
                                        </Form.Label>
                                        <Form.Select
                                            required
                                            disabled={
                                                facilitiesLoading ||
                                                Boolean(facilitiesError)
                                            }
                                            value={requester.facilityGid}
                                            onChange={(event) =>
                                                updateFacility(
                                                    event.target.value,
                                                )
                                            }
                                        >
                                            <option value="">
                                                {facilitiesLoading
                                                    ? "Loading facilities..."
                                                    : facilitiesError
                                                        ? "Facilities unavailable"
                                                        : "Select facility"}
                                            </option>
                                            {facilities.map((facility) => (
                                                <option
                                                    key={facility.gid}
                                                    value={facility.gid}
                                                >
                                                    {facility.name}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group controlId="requesterName">
                                        <Form.Label>
                                            Your name{" "}
                                            <span className="required-marker">
                                                *
                                            </span>
                                        </Form.Label>
                                        <Form.Control
                                            required
                                            value={requester.name}
                                            onChange={(event) =>
                                                updateRequesterField(
                                                    "name",
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group controlId="requesterEmail">
                                        <Form.Label>
                                            Your email{" "}
                                            <span className="required-marker">
                                                *
                                            </span>
                                        </Form.Label>
                                        <Form.Control
                                            required
                                            type="email"
                                            value={requester.email}
                                            onChange={(event) =>
                                                updateRequesterField(
                                                    "email",
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group controlId="requesterRole">
                                        <Form.Label>
                                            Department or role{" "}
                                            <span className="required-marker">
                                                *
                                            </span>
                                        </Form.Label>
                                        <Form.Control
                                            required
                                            value={requester.role}
                                            onChange={(event) =>
                                                updateRequesterField(
                                                    "role",
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group controlId="completionDate">
                                        <Form.Label>
                                            Requested completion date{" "}
                                            <span className="required-marker">
                                                *
                                            </span>
                                        </Form.Label>
                                        <Form.Control
                                            required
                                            type="date"
                                            min={minimumCompletionDate}
                                            value={requester.completionDate}
                                            onChange={(event) =>
                                                updateRequesterField(
                                                    "completionDate",
                                                    event.target.value,
                                                )
                                            }
                                        />
                                        <Form.Text>
                                            The first available date is five
                                            calendar days from today.
                                        </Form.Text>
                                    </Form.Group>
                                </Col>
                            </Row>

                            <div className="form-actions">
                                <Button
                                    type="submit"
                                    className="primary-button"
                                >
                                    Next{" "}
                                    <i className="bi bi-arrow-right ms-2" />
                                </Button>
                            </div>
                        </Form>
                    </Card.Body>
                </Card>
            </>
        );
    }

    function renderRequestOptionsScreen() {
        return (
            <>
                {renderBackButton("requester")}
                <div className="form-heading">
                    <h1 className="page-title">What are you requesting?</h1>
                    <p className="page-description">
                        Select one option to continue.
                    </p>
                </div>

                <Row className="g-3">
                    {REQUEST_OPTIONS.map((service) => (
                        <Col md={6} key={service.id}>
                            <button
                                type="button"
                                className="option-card"
                                onClick={() => selectService(service.id)}
                            >
                                <span className="option-icon">
                                    <i className={`bi ${service.icon}`} />
                                </span>
                                <span className="option-copy">
                                    <span className="option-title">
                                        {service.title}
                                    </span>
                                    <span className="option-description">
                                        {service.description}
                                    </span>
                                </span>
                                <i className="bi bi-chevron-right option-arrow" />
                            </button>
                        </Col>
                    ))}
                </Row>
            </>
        );
    }

    function addFiles(list: FileList) {
        const incoming = Array.from(list);
        const tooBig = incoming.filter((file) => file.size > MAX_FILE_BYTES);
        const allowed = incoming.filter((file) => file.size <= MAX_FILE_BYTES);

        setAttachmentNote(
            tooBig.length > 0
                ? `Skipped ${tooBig.length} file(s) over 100 MB: ${tooBig
                    .map((file) => file.name)
                    .join(", ")}`
                : "",
        );

        if (allowed.length === 0) return;

        updateServiceForm((current) => ({
            ...current,
            files: [...current.files, ...allowed],
        }));
    }

    function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
        if (event.target.files) {
            addFiles(event.target.files);
        }
        event.target.value = "";
    }

    function removeFile(index: number) {
        updateServiceForm((current) => ({
            ...current,
            files: current.files.filter((_, itemIndex) => itemIndex !== index),
        }));
    }

    function renderAttachments() {
        const files = activeServiceForm.files;

        return (
            <Form.Group className="service-field" controlId="attachments">
                <Form.Label>Attachments</Form.Label>
                <Form.Text className="d-block mb-2">
                    Add source files, references, or examples. Up to 100 MB
                    each.
                </Form.Text>
                <Form.Control type="file" multiple onChange={handleFileInput} />
                {attachmentNote && (
                    <div className="text-danger small mt-2">
                        {attachmentNote}
                    </div>
                )}
                {files.length > 0 && (
                    <ul className="list-unstyled mt-3 mb-0">
                        {files.map((file, index) => (
                            <li
                                key={`${file.name}-${index}`}
                                className="d-flex align-items-center justify-content-between border rounded px-3 py-2 mb-2"
                            >
                                <span className="text-truncate me-3">
                                    <i className="bi bi-paperclip me-2" />
                                    {file.name}
                                </span>
                                <Button
                                    type="button"
                                    variant="link"
                                    className="p-0 text-danger"
                                    onClick={() => removeFile(index)}
                                >
                                    <i className="bi bi-x-lg" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </Form.Group>
        );
    }

    function renderField(field: ServiceField) {
        if (!shouldShowField(field)) return null;
        const value = activeServiceForm.answers[field.id];

        if (field.type === "checkbox") {
            const selectedValues = Array.isArray(value) ? value : [];
            return (
                <div className="service-field" key={field.id}>
                    <div className="service-field-label">
                        {field.label}
                        {field.required && (
                            <span className="required-marker"> *</span>
                        )}
                        <span className="service-field-note">
                            {" "}
                            select all that apply
                        </span>
                    </div>
                    <div className="inline-option-grid">
                        {field.options?.map((option) => (
                            <Form.Check
                                key={option.value}
                                type="checkbox"
                                id={`${field.id}-${option.value}`}
                                label={option.label}
                                checked={selectedValues.includes(option.value)}
                                onChange={() =>
                                    toggleAnswer(field, option.value)
                                }
                            />
                        ))}
                    </div>
                </div>
            );
        }

        if (field.type === "radio") {
            return (
                <div className="service-field" key={field.id}>
                    <div className="service-field-label">
                        {field.label}
                        {field.required && (
                            <span className="required-marker"> *</span>
                        )}
                    </div>
                    <div className="inline-option-grid">
                        {field.options?.map((option) => (
                            <Form.Check
                                key={option.value}
                                type="radio"
                                name={field.id}
                                id={`${field.id}-${option.value}`}
                                label={option.label}
                                checked={value === option.value}
                                onChange={() =>
                                    updateAnswer(field, option.value)
                                }
                            />
                        ))}
                    </div>
                </div>
            );
        }

        if (field.type === "select") {
            return (
                <Form.Group
                    className="service-field"
                    controlId={field.id}
                    key={field.id}
                >
                    <Form.Label>
                        {field.label}
                        {field.required && (
                            <span className="required-marker"> *</span>
                        )}
                    </Form.Label>
                    {field.helpText && (
                        <Form.Text className="d-block mb-2">
                            {field.helpText}
                        </Form.Text>
                    )}
                    <Form.Select
                        value={typeof value === "string" ? value : ""}
                        onChange={(event) =>
                            updateAnswer(field, event.target.value)
                        }
                    >
                        <option value="">Select an option</option>
                        {field.options?.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Form.Select>
                </Form.Group>
            );
        }

        return (
            <Form.Group
                className="service-field"
                controlId={field.id}
                key={field.id}
            >
                <Form.Label>
                    {field.label}
                    {field.required && (
                        <span className="required-marker"> *</span>
                    )}
                </Form.Label>
                <Form.Control
                    type={field.type}
                    placeholder={field.placeholder}
                    value={typeof value === "string" ? value : ""}
                    onChange={(event) =>
                        updateAnswer(field, event.target.value)
                    }
                />
            </Form.Group>
        );
    }

    function renderPrintItemConfiguration() {
        if (!selectedService || selectedService.id !== "print") return null;

        const selectedChoices = selectedService.choices.filter((choice) =>
            activeServiceForm.choiceIds.includes(choice.id),
        );

        if (selectedChoices.length === 0) return null;

        return (
            <div className="print-config-section">
                <div className="print-config-heading">
                    <h2 className="section-title mb-1">
                        Configure your selected print items
                    </h2>
                    <p className="page-description">
                        Add dimensions and quantity for each item you selected.
                    </p>
                </div>

                <div className="print-config-list">
                    {selectedChoices.map((choice) => {
                        const item = activeServiceForm.printItems[
                            choice.id
                        ] ?? {
                            dimensions: "",
                            customDimensions: "",
                            quantity: "",
                        };

                        return (
                            <div className="print-config-row" key={choice.id}>
                                <div className="print-config-item">
                                    <span className="option-icon">
                                        <i className={`bi ${choice.icon}`} />
                                    </span>
                                    <div>
                                        <div className="print-config-title">
                                            {choice.title}
                                        </div>
                                        <div className="print-config-description">
                                            Configure this item separately.
                                        </div>
                                    </div>
                                </div>

                                <Form.Group
                                    className="print-config-field"
                                    controlId={`${choice.id}-dimensions`}
                                >
                                    <Form.Label>
                                        {choice.id === "brochure"
                                            ? "Brochure type"
                                            : "Dimensions"}{" "}
                                        <span className="required-marker">
                                            *
                                        </span>
                                    </Form.Label>
                                    <Form.Select
                                        value={item.dimensions}
                                        onChange={(event) =>
                                            updatePrintItem(
                                                choice.id,
                                                "dimensions",
                                                event.target.value,
                                            )
                                        }
                                    >
                                        <option value="">
                                            {choice.id === "brochure"
                                                ? "Select a brochure type"
                                                : "Select a size"}
                                        </option>

                                        {choice.id === "brochure" ? (
                                            <>
                                                <option value="Tri-fold">
                                                    Tri-fold
                                                </option>
                                                <option value="Bi-fold">
                                                    Bi-fold
                                                </option>
                                                <option value="Z-fold">
                                                    Z-fold
                                                </option>
                                                <option value="Gate-fold">
                                                    Gate-fold
                                                </option>
                                                <option value="Booklet">
                                                    Booklet
                                                </option>
                                                <option value="custom">
                                                    Other / Custom
                                                </option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="8.5 x 11">
                                                    8.5 × 11
                                                </option>
                                                <option value="8 x 10">
                                                    8 × 10
                                                </option>
                                                <option value="10 x 12">
                                                    10 × 12
                                                </option>
                                                <option value="11 x 14">
                                                    11 × 14
                                                </option>
                                                <option value="11 x 17">
                                                    11 × 17
                                                </option>
                                                <option value="custom">
                                                    Custom size
                                                </option>
                                            </>
                                        )}
                                    </Form.Select>
                                    <Form.Text>
                                        {choice.id === "brochure"
                                            ? "Choose the brochure fold or format."
                                            : "Select a standard size or choose Custom."}
                                    </Form.Text>
                                </Form.Group>

                                {item.dimensions === "custom" && (
                                    <Form.Group
                                        className="print-config-field"
                                        controlId={`${choice.id}-custom-dimensions`}
                                    >
                                        <Form.Label>
                                            {choice.id === "brochure"
                                                ? "Custom brochure type"
                                                : "Custom dimensions"}{" "}
                                            <span className="required-marker">
                                                *
                                            </span>
                                        </Form.Label>
                                        <Form.Control
                                            value={item.customDimensions}
                                            placeholder={
                                                choice.id === "brochure"
                                                    ? "Describe the brochure type"
                                                    : "Example: 12 × 18"
                                            }
                                            onChange={(event) =>
                                                updatePrintItem(
                                                    choice.id,
                                                    "customDimensions",
                                                    event.target.value,
                                                )
                                            }
                                        />
                                        <Form.Text>
                                            {choice.id === "brochure"
                                                ? "Describe the fold or brochure format."
                                                : "Enter the custom dimensions."}
                                        </Form.Text>
                                    </Form.Group>
                                )}

                                <Form.Group
                                    className="print-config-field print-quantity-field"
                                    controlId={`${choice.id}-quantity`}
                                >
                                    <Form.Label>
                                        Quantity{" "}
                                        <span className="required-marker">
                                            *
                                        </span>
                                    </Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        placeholder="Example: 250"
                                        onChange={(event) =>
                                            updatePrintItem(
                                                choice.id,
                                                "quantity",
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <Form.Text>
                                        Enter the total quantity needed.
                                    </Form.Text>
                                </Form.Group>

                                <Button
                                    type="button"
                                    variant="outline-danger"
                                    className="print-remove-button"
                                    onClick={() => toggleChoice(choice.id)}
                                >
                                    <i className="bi bi-trash me-2" />
                                    Remove
                                </Button>
                            </div>
                        );
                    })}
                </div>

                <Form.Group
                    className="print-details-field"
                    controlId="serviceDetails"
                >
                    <Form.Label>
                        Details <span className="required-marker">*</span>
                    </Form.Label>
                    <Form.Text className="d-block mb-2">
                        {selectedService.detailsHelp}
                    </Form.Text>
                    <Form.Control
                        as="textarea"
                        rows={6}
                        maxLength={2000}
                        placeholder="Enter details here..."
                        value={activeServiceForm.details}
                        onChange={(event) =>
                            updateServiceForm((current) => ({
                                ...current,
                                details: event.target.value,
                            }))
                        }
                    />
                    <div className="character-count">
                        {activeServiceForm.details.length} / 2000
                    </div>
                </Form.Group>

                {renderAttachments()}

                <div className="form-actions">
                    <Button
                        type="button"
                        className="primary-button"
                        disabled={!isServiceFormComplete()}
                        onClick={addServiceAndReview}
                    >
                        Review request <i className="bi bi-arrow-right ms-2" />
                    </Button>
                </div>
            </div>
        );
    }

    function renderServiceDetailsScreen() {
        if (!selectedService) return null;

        return (
            <>
                {renderBackButton("request-options")}
                <div className="form-heading">
                    <h1 className="page-title">{selectedService.title}</h1>
                    <p className="page-description">
                        Select the specific service needed.
                    </p>
                </div>

                <Row className="g-3 mb-4">
                    {selectedService.choices.map((choice) => {
                        const selected = activeServiceForm.choiceIds.includes(
                            choice.id,
                        );

                        return (
                            <Col sm={6} lg={4} key={choice.id}>
                                <button
                                    type="button"
                                    className={`option-card selectable-option service-choice-card ${selected ? "selected" : ""}`}
                                    onClick={() => toggleChoice(choice.id)}
                                >
                                    <span className="option-icon">
                                        <i className={`bi ${choice.icon}`} />
                                    </span>
                                    <span className="option-copy">
                                        <span className="option-title">
                                            {choice.title}
                                        </span>
                                    </span>
                                    <span className="selection-check">
                                        {selected && (
                                            <i className="bi bi-check-lg" />
                                        )}
                                    </span>
                                </button>
                            </Col>
                        );
                    })}
                </Row>

                {selectedService.id === "print" ? (
                    renderPrintItemConfiguration()
                ) : (
                    <Card className="request-card">
                        <Card.Body className="p-4 p-md-5">
                            {selectedService.fields.map(renderField)}

                            <Form.Group
                                className="service-field mb-0"
                                controlId="serviceDetails"
                            >
                                <Form.Label>
                                    Details{" "}
                                    <span className="required-marker">*</span>
                                </Form.Label>
                                <Form.Text className="d-block mb-2">
                                    {selectedService.detailsHelp}
                                </Form.Text>
                                <Form.Control
                                    as="textarea"
                                    rows={6}
                                    maxLength={2000}
                                    placeholder="Enter details here..."
                                    value={activeServiceForm.details}
                                    onChange={(event) =>
                                        updateServiceForm((current) => ({
                                            ...current,
                                            details: event.target.value,
                                        }))
                                    }
                                />
                                <div className="character-count">
                                    {activeServiceForm.details.length} / 2000
                                </div>
                            </Form.Group>

                            {renderAttachments()}

                            <div className="form-actions">
                                <Button
                                    type="button"
                                    className="primary-button"
                                    disabled={!isServiceFormComplete()}
                                    onClick={addServiceAndReview}
                                >
                                    Review request{" "}
                                    <i className="bi bi-arrow-right ms-2" />
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                )}
            </>
        );
    }

    async function handleSubmit() {
        if (addedServiceIds.length === 0 || submitState === "submitting") {
            return;
        }

        setSubmitState("submitting");
        setSubmitError("");

        const services: Array<Record<string, unknown>> = [];

        for (const serviceId of addedServiceIds) {
            const service = REQUEST_OPTIONS.find(
                (item) => item.id === serviceId,
            );
            if (!service) continue;

            const form = serviceForms[serviceId] ?? createEmptyServiceState();

            const choices = service.choices
                .filter((choice) => form.choiceIds.includes(choice.id))
                .map((choice) => ({ id: choice.id, title: choice.title }));

            const fields =
                service.id === "print"
                    ? []
                    : service.fields
                        .filter((field) => shouldShowFieldFor(field, form))
                        .map((field) => ({
                            id: field.id,
                            label: field.label,
                            value: form.answers[field.id] ?? "",
                        }));

            const printItems =
                service.id === "print"
                    ? form.choiceIds.map((choiceId) => {
                        const choice = service.choices.find(
                            (item) => item.id === choiceId,
                        );
                        const item = form.printItems[choiceId];
                        const spec =
                            item?.dimensions === "custom"
                                ? item.customDimensions
                                : (item?.dimensions ?? "");

                        return {
                            id: choiceId,
                            title: choice?.title ?? choiceId,
                            spec,
                            quantity: item?.quantity ?? "",
                        };
                    })
                    : [];

            services.push({
                id: service.id,
                title: service.title,
                teams: service.teams,
                choices,
                fields,
                printItems,
                details: form.details,
            });
        }

        const payload = { requester, services };

        const body = new FormData();
        console.log("FRONTEND payload:", payload);


        body.append("payload", JSON.stringify(payload));
        for (const serviceId of addedServiceIds) {
            const form = serviceForms[serviceId];
            for (const file of form?.files ?? []) {
                body.append(`file:${serviceId}`, file, file.name);
            }
        }

        try {
            const response = await fetch("/api/asana/requests", {
                method: "POST",
                body,
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.error || "Unable to submit the request.",
                );
            }

            setSubmittedUrl(result.parentTask?.permalink_url ?? "");
            setSubmitState("success");
            setScreen("confirmation");
        } catch (error) {
            setSubmitError(
                error instanceof Error
                    ? error.message
                    : "Unable to submit the request.",
            );
            setSubmitState("error");
        }
    }

    function renderServiceReviewCard(serviceId: string) {
        const service = REQUEST_OPTIONS.find((item) => item.id === serviceId);
        if (!service) return null;

        const form = serviceForms[serviceId] ?? createEmptyServiceState();
        const choiceLabels = service.choices
            .filter((choice) => form.choiceIds.includes(choice.id))
            .map((choice) => choice.title);

        return (
            <Card className="request-card mb-4" key={serviceId}>
                <Card.Body className="p-4 p-md-5">
                    <div className="d-flex justify-content-between align-items-baseline gap-3 mb-3">
                        <h2 className="section-title mb-0">{service.title}</h2>
                        <div className="d-flex gap-2 flex-shrink-0">
                            <Button
                                type="button"
                                variant="outline-secondary"
                                size="sm"
                                disabled={submitState === "submitting"}
                                onClick={() => editService(serviceId)}
                            >
                                <i className="bi bi-pencil me-1" />
                                Edit
                            </Button>
                            <Button
                                type="button"
                                variant="outline-danger"
                                size="sm"
                                disabled={submitState === "submitting"}
                                onClick={() => removeService(serviceId)}
                            >
                                <i className="bi bi-trash me-1" />
                                Remove
                            </Button>
                        </div>
                    </div>

                    <div className="review-row">
                        <span className="review-label">Routes to</span>
                        <span>{service.teams.join(" & ")}</span>
                    </div>
                    <div className="review-row">
                        <span className="review-label">Selected work</span>
                        <span>{choiceLabels.join(", ")}</span>
                    </div>

                    {service.id === "print" &&
                        form.choiceIds.map((choiceId) => {
                            const choice = service.choices.find(
                                (item) => item.id === choiceId,
                            );
                            const item = form.printItems[choiceId];
                            const configuration =
                                item?.dimensions === "custom"
                                    ? item.customDimensions
                                    : item?.dimensions;

                            return (
                                <div className="review-row" key={choiceId}>
                                    <span className="review-label">
                                        {choice?.title ?? choiceId}
                                    </span>
                                    <span>
                                        {choiceId === "brochure"
                                            ? `Type: ${configuration || "—"}`
                                            : configuration || "—"}{" "}
                                        · Quantity {item?.quantity || "—"}
                                    </span>
                                </div>
                            );
                        })}

                    {service.id !== "print" &&
                        service.fields
                            .filter((field) => shouldShowFieldFor(field, form))
                            .map((field) => {
                                const answer = form.answers[field.id];

                                return (
                                    <div className="review-row" key={field.id}>
                                        <span className="review-label">
                                            {field.label}
                                        </span>
                                        <span>
                                            {Array.isArray(answer)
                                                ? answer.join(", ")
                                                : answer || "—"}
                                        </span>
                                    </div>
                                );
                            })}

                    <div className="review-row">
                        <span className="review-label">Details</span>
                        <span>{form.details}</span>
                    </div>

                    {form.files.length > 0 && (
                        <div className="review-row">
                            <span className="review-label">Attachments</span>
                            <span>
                                {form.files.map((file) => file.name).join(", ")}
                            </span>
                        </div>
                    )}
                </Card.Body>
            </Card>
        );
    }

    function renderReviewScreen() {
        if (addedServiceIds.length === 0) return null;

        return (
            <>
                {renderBackButton("service-details")}
                <div className="form-heading">
                    <h1 className="page-title">Review request</h1>
                    <p className="page-description">
                        Confirm the information before submission.
                    </p>
                </div>

                <Card className="request-card mb-4">
                    <Card.Body className="p-4 p-md-5">
                        <h2 className="section-title">Requester</h2>
                        <div className="review-row">
                            <span className="review-label">Facility</span>
                            <span>{requester.facility}</span>
                        </div>
                        <div className="review-row">
                            <span className="review-label">Requested by</span>
                            <span>{requester.name}</span>
                        </div>
                        <div className="review-row">
                            <span className="review-label">Email</span>
                            <span>{requester.email}</span>
                        </div>
                        <div className="review-row">
                            <span className="review-label">
                                Requested completion
                            </span>
                            <span>{requester.completionDate}</span>
                        </div>
                    </Card.Body>
                </Card>

                {addedServiceIds.map((serviceId) =>
                    renderServiceReviewCard(serviceId),
                )}

                <div className="mb-4">
                    {submitState === "error" && (
                        <div
                            className="alert alert-danger d-flex align-items-center mb-3"
                            role="alert"
                        >
                            <i className="bi bi-exclamation-triangle-fill me-2" />
                            <span>{submitError}</span>
                        </div>
                    )}

                    <div className="form-actions">
                        <Button
                            type="button"
                            variant="outline-secondary"
                            className="me-auto"
                            disabled={submitState === "submitting"}
                            onClick={() => setScreen("request-options")}
                        >
                            <i className="bi bi-plus-lg me-2" />
                            Add another service
                        </Button>
                        <Button
                            type="button"
                            className="primary-button"
                            disabled={submitState === "submitting"}
                            onClick={handleSubmit}
                        >
                            {submitState === "submitting" ? (
                                <>
                                    <span
                                        className="spinner-border spinner-border-sm me-2"
                                        role="status"
                                        aria-hidden="true"
                                    />
                                    Submitting...
                                </>
                            ) : (
                                "Submit request"
                            )}
                        </Button>
                    </div>
                </div>
            </>
        );
    }

    function resetForm() {
        setRequester({
            facility: "",
            facilityGid: "",
            name: "",
            email: "",
            role: "",
            completionDate: minimumCompletionDate,
        });
        setSelectedServiceId("");
        setAddedServiceIds([]);
        setServiceForms({});
        setSubmitState("idle");
        setSubmitError("");
        setSubmittedUrl("");
        setAttachmentNote("");
        setScreen("requester");
    }

    function renderConfirmationScreen() {
        return (
            <>
                <div className="text-center mb-4">
                    <i
                        className="bi bi-check-circle-fill text-success"
                        style={{ fontSize: "3.25rem" }}
                    />
                    <h1 className="page-title mt-3">
                        Thank you — your request is in
                    </h1>
                    <p className="page-description mx-auto">
                        Your marketing request has been submitted and routed to
                        the team.
                        {submittedUrl && (
                            <>
                                {" "}
                                <a
                                    href={submittedUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    View the task in Asana
                                </a>
                                .
                            </>
                        )}
                    </p>
                </div>

                <Card className="request-card mb-4">
                    <Card.Body className="p-4 p-md-5">
                        <h2 className="section-title">Request summary</h2>
                        <div className="review-row">
                            <span className="review-label">Facility</span>
                            <span>{requester.facility}</span>
                        </div>
                        <div className="review-row">
                            <span className="review-label">Requested by</span>
                            <span>{requester.name}</span>
                        </div>
                        <div className="review-row">
                            <span className="review-label">Email</span>
                            <span>{requester.email}</span>
                        </div>
                        <div className="review-row">
                            <span className="review-label">
                                Requested completion
                            </span>
                            <span>{requester.completionDate}</span>
                        </div>

                        {addedServiceIds.map((serviceId) => {
                            const service = REQUEST_OPTIONS.find(
                                (item) => item.id === serviceId,
                            );
                            if (!service) return null;

                            return (
                                <div className="review-row" key={serviceId}>
                                    <span className="review-label">
                                        {service.title}
                                    </span>
                                    <span>
                                        Routes to {service.teams.join(" & ")}
                                    </span>
                                </div>
                            );
                        })}
                    </Card.Body>
                </Card>

                <div className="form-actions">
                    <Button
                        type="button"
                        className="primary-button"
                        onClick={resetForm}
                    >
                        <i className="bi bi-plus-lg me-2" />
                        Submit another request
                    </Button>
                </div>
            </>
        );
    }

    return (
        <main className="app-page">
            <Container className="form-shell">
                {screen === "requester" && renderRequesterScreen()}
                {screen === "request-options" && renderRequestOptionsScreen()}
                {screen === "service-details" && renderServiceDetailsScreen()}
                {screen === "review" && renderReviewScreen()}
                {screen === "confirmation" && renderConfirmationScreen()}
            </Container>
        </main>
    );
}
// comment 