export interface HistoryEntry {
    pathname: string;
    params?: Record<string, any>;
}

export function isSameStack(pathA?: string, pathB?: string): boolean {
    if (!pathA || !pathB) return false;

    const cleanA = pathA.replace(/^\/?(\(app\)\/)?(\(tabs\)\/)?/, "").replace(/^\//, "");
    const cleanB = pathB.replace(/^\/?(\(app\)\/)?(\(tabs\)\/)?/, "").replace(/^\//, "");

    const partsA = cleanA.split("/").filter(Boolean);
    const partsB = cleanB.split("/").filter(Boolean);

    if (partsA.length === 0 || partsB.length === 0) return false;

    if (partsA[0] !== partsB[0]) return false;

    if (partsA[0] === "home") {
        if (partsA[1] !== partsB[1]) return false;
    }

    return true;
}

class NavigationTracker {
    private history: HistoryEntry[] = [];
    private isNavigatingBack: boolean = false;

    public record(pathname: string, params?: Record<string, any>) {
        if (!pathname) return;

        if (this.isNavigatingBack) {
            this.isNavigatingBack = false;
            return;
        }

        const current = this.getCurrent();
        if (current && current.pathname === pathname) {
            return;
        }

        this.history.push({ pathname, params });
        if (this.history.length > 50) {
            this.history.shift();
        }
    }

    public getCurrent(): HistoryEntry | undefined {
        return this.history[this.history.length - 1];
    }

    public getPrevious(): HistoryEntry | undefined {
        if (this.history.length < 2) return undefined;
        return this.history[this.history.length - 2];
    }

    public pop(): HistoryEntry | undefined {
        this.isNavigatingBack = true;
        return this.history.pop();
    }

    public markNavigatingBack() {
        this.isNavigatingBack = true;
    }
}

export const navigationTracker = new NavigationTracker();
