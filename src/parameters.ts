// The parameters understood by the ```bpmn code block (parsed in readParameters,
// main.ts). Single source of truth for the parameter table in the settings
// modal and for the in-editor autocomplete suggestions.
export interface BpmnBlockParameter {
    name: string;
    description: string;
    values: string;
}

export const BPMN_BLOCK_PARAMETERS: BpmnBlockParameter[] = [
    {
        name: "url",
        description: "The url of the *.bpmn file (required).",
        values: "Relative/Absolute path, or as \"[[*.bpmn]]\" markdown link.",
    },
    {name: "height", description: "The height of the rendered canvas.", values: "[200..1000]"},
    {name: "opendiagram", description: "Show a link to the *.bpmn file.", values: "True/False"},
    {name: "showzoom", description: "Show the zoom buttons below the canvas.", values: "True/False"},
    {name: "enablepanzoom", description: "Enable pan and zoom.", values: "True/False"},
    {name: "zoom", description: "Set the zoom level. Default is 'fit-viewport'.", values: "0.0 - 10.0"},
    {name: "x", description: "Set the x coordinate, if a zoom value is set.", values: "0 - ... (default: 0)"},
    {name: "y", description: "Set the y coordinate, if a zoom value is set.", values: "0 - ... (default: 0)"},
    {name: "forcewhitebackground", description: "Force a white background.", values: "True/False"},
];
