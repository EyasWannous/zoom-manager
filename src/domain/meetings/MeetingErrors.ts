export abstract class MeetingDomainError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class MeetingNotFoundError extends MeetingDomainError {
    public readonly meetingId: string;

    constructor(meetingId: string) {
        super(`Meeting with id '${meetingId}' was not found.`);
        this.meetingId = meetingId;
    }
}

export class MeetingValidationError extends MeetingDomainError {
    public readonly errors: string[];

    constructor(errors: string[]) {
        super(`Meeting validation failed: ${errors.join('; ')}`);
        this.errors = errors;
    }
}

export class MeetingConflictError extends MeetingDomainError {
    constructor(message: string) {
        super(message);
    }
}
