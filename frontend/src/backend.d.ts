import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export type Time = bigint;
export interface ImageVersion {
    url: string;
    resolutionPercentage: bigint;
    fundingThreshold: bigint;
}
export interface WorkSummary {
    id: TextWorkId;
    workType: WorkType;
    title: string;
    randomUnlock: boolean;
    publishedAt: Time;
    author: string;
    targetAmount: bigint;
    contentPreview: string;
    timeWindow: TimeWindow;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface WorkDetail {
    work: Work;
    unlocked: boolean;
    receivedAmount: bigint;
    unlockProgress: bigint;
}
export type TextWorkId = string;
export interface FileVersion {
    url: string;
    originalFilename: string;
    mimeType: string;
    fundingThreshold: bigint;
}
export interface AppSettings {
    analyticsEnabled: boolean;
    gaTrackingId?: string;
    allowAnonymousPublishing: boolean;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface Work {
    id: TextWorkId;
    workType: WorkType;
    fileVersion?: FileVersion;
    title: string;
    creator: Principal;
    deleted: boolean;
    progressiveUnlock: boolean;
    content: string;
    accountId: string;
    randomUnlock: boolean;
    publishedAt: Time;
    author: string;
    targetAmount: bigint;
    imageVersions?: Array<ImageVersion>;
    timeWindow: TimeWindow;
}
export interface UserProfile {
    principalAddress?: Principal;
    name: string;
    createdAt: Time;
    updatedAt: Time;
}
export interface RandomUnlockState {
    unlockedString: string;
    lastUpdated: Time;
    fundingPercentageWhenGenerated: bigint;
    viewerPrincipal: Principal;
    workId: TextWorkId;
}
export enum TimeWindow {
    permanent = "permanent",
    last1Hour = "last1Hour",
    last24Hours = "last24Hours",
    last7Days = "last7Days",
    last30Days = "last30Days"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum WorkType {
    audio = "audio",
    file = "file",
    text = "text",
    image = "image"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createWork(id: TextWorkId, title: string, content: string, workType: WorkType, targetAmount: bigint, accountId: string, progressiveUnlock: boolean, randomUnlock: boolean, fileVersion: FileVersion | null, imageVersions: Array<ImageVersion> | null, timeWindow: TimeWindow): Promise<void>;
    deleteWork(id: TextWorkId): Promise<void>;
    getActiveWork(id: TextWorkId): Promise<Work>;
    getActiveWorksByOwner(owner: Principal): Promise<Array<WorkSummary>>;
    getAllPaidWorks(): Promise<Array<WorkSummary>>;
    getAllWorksAdmin(): Promise<Array<Work>>;
    getAnalyticsSettings(): Promise<{
        analyticsEnabled: boolean;
        gaTrackingId?: string;
    }>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getRandomUnlockState(workId: TextWorkId): Promise<RandomUnlockState | null>;
    getRandomUnlockStatusLookup(id: TextWorkId): Promise<boolean>;
    getRemovedWorksByOwner(owner: Principal): Promise<Array<WorkSummary>>;
    getSettings(): Promise<AppSettings>;
    getUserPrincipal(): Promise<Principal | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getValidWorksByCreator(creator: Principal): Promise<Array<WorkSummary>>;
    getWork(id: TextWorkId): Promise<Work | null>;
    getWorkDetailsWithTimeWindow(workId: TextWorkId): Promise<WorkDetail>;
    getWorkTimeWindow(workId: TextWorkId): Promise<TimeWindow>;
    getWorksByCreator(creator: Principal): Promise<Array<WorkSummary>>;
    getWorksForCreator(creator: Principal): Promise<Array<WorkSummary>>;
    getWorksWithRandomUnlock(): Promise<Array<WorkSummary>>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveRandomUnlockState(workId: TextWorkId, unlockedText: string, fundingPercentage: bigint): Promise<void>;
    setUserPrincipal(principal: Principal): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateAnalyticsSettings(settings: {
        analyticsEnabled: boolean;
        gaTrackingId?: string;
    }): Promise<void>;
    updateRandomUnlockState(workId: TextWorkId, newUnlockedText: string, currentFundingPercentage: bigint): Promise<void>;
    updateSettings(settings: AppSettings): Promise<void>;
    updateWork(id: TextWorkId, title: string, content: string, author: string, workType: WorkType, targetAmount: bigint, accountId: string, progressiveUnlock: boolean, randomUnlock: boolean, fileVersion: FileVersion | null, imageVersions: Array<ImageVersion> | null): Promise<void>;
}
