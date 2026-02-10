export interface LogEvent {
  _time: string;
  level: "info" | "warn" | "error";
  message: string;
  requestId: string;
  audit?: boolean;
  [key: string]: unknown;
}

export class RequestLogger {
  private events: LogEvent[] = [];
  readonly requestId: string;

  constructor(requestId: string) {
    this.requestId = requestId;
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.emit("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.emit("warn", message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.emit("error", message, data);
  }

  audit(message: string, data?: Record<string, unknown>): void {
    this.emit("info", message, { ...data, audit: true });
  }

  private emit(
    level: LogEvent["level"],
    message: string,
    data?: Record<string, unknown>,
  ): void {
    this.events.push({
      _time: new Date().toISOString(),
      level,
      message,
      requestId: this.requestId,
      ...data,
    });
  }

  flush(): LogEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }
}
