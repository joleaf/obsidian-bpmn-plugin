// Augmentations for typed modules (diagram-js, obsidian).
//
// This file must be a MODULE (the `export {}` below) so that `declare module`
// blocks are treated as augmentations. Augmentations only work for modules
// that already ship types — the untyped extension packages are declared
// ambiently in index.d.ts (a global script).

export {};

// diagram-js only ships types for the Diagram class itself. Add the services
// this plugin resolves via Diagram.get(), plus the event-bus methods it calls.
declare module "diagram-js" {
    //interface Diagram<ServiceMap = null> {
    //    on(eventName: string, callback: (...args: unknown[]) => void): void;
    //    off(eventName: string, callback?: (...args: unknown[]) => void): void;
    //}
    interface Canvas {
        focus(): void;
        viewbox(): {x: number; y: number; width: number; height: number; scale: number};
        zoom(zoom: number | "fit-viewport", options?: {x?: number; y?: number}): void;
    }
    interface ElementRegistry {
        get(id: string): {x: number; y: number; width: number; height: number};
    }
    interface CommandStack {
        undo(): void;
        redo(): void;
    }
    interface ZoomScroll {
        stepZoom(delta: number): void;
    }
}

// obsidian's bundled types are missing App.getTheme() — add it.
// Declared as `string` on purpose: Obsidian <= 0.9 returned theme names
// ("obsidian" / "moonstone"), current versions return "light" / "dark", and
// the plugin checks for the old names — a literal union would be a type error.
declare module "obsidian" {
    interface App {
        getTheme(): string;
    }
}
