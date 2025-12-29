export const Priority = {
    CRITICAL: 'CRITICAL',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW',
} as const;
export type Priority = typeof Priority[keyof typeof Priority];

export const WorkItemType = {
    EPIC: 'EPIC',
    FEATURE: 'FEATURE',
    STORY: 'STORY',
    BUG: 'BUG',
    TASK: 'TASK',
    SUB_TASK: 'SUB_TASK',
} as const;
export type WorkItemType = typeof WorkItemType[keyof typeof WorkItemType];

export const WorkItemStateCategory = {
    TODO: 'TODO',
    IN_PROGRESS: 'IN_PROGRESS',
    DONE: 'DONE',
    ARCHIVED: 'ARCHIVED',
} as const;
export type WorkItemStateCategory = typeof WorkItemStateCategory[keyof typeof WorkItemStateCategory];
