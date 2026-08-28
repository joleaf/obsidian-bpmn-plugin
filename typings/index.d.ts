// Ambient declarations for the bpmn-js extension packages that ship no types.
//
// This file must stay a GLOBAL SCRIPT (no top-level import/export): in a module
// file, `declare module "x"` is treated as an *augmentation*, which is only
// possible for modules that already ship types. Ambient declarations for the
// untyped packages below only take effect in a script file.
//
// NOTE: bpmn-js core ships its own .d.ts files (lib/Modeler, lib/Viewer,
// lib/NavigatedViewer, lib/BaseViewer) — do NOT add ambient declarations for
// those here, they would shadow the real types and turn everything into `any`.
//
// Module augmentations for typed packages (diagram-js, obsidian) live in
// augment.d.ts.

declare module "bpmn-js-properties-panel" {
    import type {ModuleDeclaration} from "didi";
    const BpmnPropertiesPanelModule: ModuleDeclaration;
    const BpmnPropertiesProviderModule: ModuleDeclaration;
    export {BpmnPropertiesPanelModule, BpmnPropertiesProviderModule};
}

declare module "bpmn-js-token-simulation" {
    import type {ModuleDeclaration} from "didi";
    const TokenSimulationModule: ModuleDeclaration;
    export default TokenSimulationModule;
    // services resolved via modeler.get("simulationTrace" / "simulationSupport")
    interface SimulationTrace {
        start(): void;
        stop(): void;
        _events: unknown[];
    }
    interface SimulationSupport {
        getHistory(): string[];
    }
    export {SimulationTrace, SimulationSupport};
}

declare module "bpmn-js-token-simulation/lib/simulation-support" {
    import type {ModuleDeclaration} from "didi";
    const SimulationSupportModule: ModuleDeclaration;
    export default SimulationSupportModule;
}

declare module "bpmn-js-color-picker" {
    import type {ModuleDeclaration} from "didi";
    const BpmnColorPickerModule: ModuleDeclaration;
    export default BpmnColorPickerModule;
}

declare module "bpmn-js-sketchy" {
    import type {ModuleDeclaration} from "didi";
    const SketchyRendererModule: ModuleDeclaration;
    export default SketchyRendererModule;
}

declare module "diagram-js-minimap" {
    import type {ModuleDeclaration} from "didi";
    const MinimapModule: ModuleDeclaration;
    export default MinimapModule;
}

declare module "diagram-js-grid" {
    import type {ModuleDeclaration} from "didi";
    const GridModule: ModuleDeclaration;
    export default GridModule;
}

declare module "bpmn-js-create-append-anything" {
    import type {ModuleDeclaration} from "didi";
    const CreateAppendAnythingModule: ModuleDeclaration;
    export {CreateAppendAnythingModule};
}
