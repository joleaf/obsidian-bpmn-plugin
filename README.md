# BPMN-Plugin for Obsidian [![GitHub tag (latest by date)](https://img.shields.io/github/v/tag/joleaf/obsidian-bpmn-plugin)](https://github.com/joleaf/obsidian-bpmn-plugin/releases) [![Release Obsidian Plugin](https://github.com/joleaf/obsidian-bpmn-plugin/actions/workflows/release.yml/badge.svg)](https://github.com/joleaf/obsidian-bpmn-plugin/actions/workflows/release.yml) [![Obsidian downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%238b6cef&label=downloads&query=%24%5B%22bpmn-plugin%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json)](https://obsidian.md/plugins?id=bpmn-plugin)

This plugin lets you view BPMN diagrams interactively in your [Obsidian](https://www.obsidian.md) notes with an `bpmn`
code-block.
Furthermore, a BPMN modeler lets you edit your BPMNs directly in Obsidian.
The plugin is based on the [bpmn-js](https://github.com/bpmn-io/bpmn-js) library.

**NEW Feature:** Token Simulation!

## How to use (CodeBlock)

1. Add a valid `*.bpmn` file to your vault
2. Add the BPMN diagram to your note:

````
```bpmn
url: [[my-diagram.bpmn]]
```
````

### Parameter

You can customize the view with the following parameters:

| Parameter            | Description                                    | Values                                                    |
|----------------------|------------------------------------------------|-----------------------------------------------------------|
| url                  | The url of the *.bpmn file (required).         | Relative/Absolute path, or as "[[*.bpmn]]" markdown link. |
| height               | The height of the rendered canvas.             | [200..1000]                                               |
| opendiagram          | Show a link to the *.bpmn file.                | True/False                                                |
| showzoom             | Show the zoom buttons below the canvas.        | True/False                                                |
| enablepanzoom        | Enable pan and zoom.                           | True/False                                                |
| zoom                 | Set the zoom level. Default is 'fit-viewport'. | 0.0 - 10.0                                                |
| x                    | Set the x coordinate, if a zoom value is set.  | 0 - ... (default: 0)                                      |
| y                    | Set the y coordinate, if a zoom value is set.  | 0 - ... (default: 0)                                      |
| forcewhitebackground | Force a white background.                      | True/False                                                |

While typing inside a `bpmn` code block, Obsidian autocompletes the parameter names (with a short value hint and the full description on hover).

### Insert / Edit code block from a popup

You don't have to type the code block manually:

1. Open a markdown note and put the cursor where the diagram should be inserted (or inside an existing `bpmn` code block to edit it)
2. Run the command **"Insert / Edit BPMN code block"** from the command palette (it is only enabled while a markdown file is active)
3. Pick the file with **Browse...** (all `*.bpmn` files of the vault are listed) and adjust the other parameters
4. Click **Insert** — the code block is created at the cursor position (or the block the cursor was in gets replaced)

### Create a new BPMN

The command **"Create BPMN"** creates a new `*.bpmn` file (in the folder of the active file) and opens it in the BPMN modeler.
The **New BPMN** ribbon icon does the same.

### Example

![Example](example/bpmn-plugin.gif)

## How to edit the BPMN

Just open the BPMN file in your obsidian vault and the BPMN will be editable in fullscreen mode.

### Features

- Token simulation
- Update properties
- Export SVG

## Install ..

### .. automatically in Obsidian

1. Go to **Community Plugins** in your Obsidian Settings and **disable** Safe Mode
2. Click on **Browse** and search for "[BPMN](obsidian://show-plugin?id=bpmn-plugin)"
3. Click install
4. Toggle the plugin on in the **Community Plugins** tab

### .. manually from this repo

1. Download the latest [release](https://github.com/joleaf/obsidian-bpmn-plugin/releases) `*.zip` file.
2. Unpack the zip in the `.obsidan/plugins` folder of your obsidian vault

## How to dev

1. Clone this repo into the plugin folder of a (non-productive) vault (`.obsidian/plugins/`)
2. `npm i`
3. `npm run dev`
4. Toggle the plugin on in the **Community Plugins** tab

## Donate

<a href='https://ko-fi.com/joleaf' target='_blank'><img height='35' style='border:0px;height:46px;' src='https://az743702.vo.msecnd.net/cdn/kofi3.png?v=0' border='0' alt='Buy Me a Coffee at ko-fi.com' />
