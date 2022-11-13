# Obsidian-BPMN-Plugin [![GitHub tag (latest by date)](https://img.shields.io/github/v/tag/joleaf/obsidian-bpmn-plugin)](https://github.com/joleaf/obsidian-bpmn-plugin/releases) [![Release Obsidian Plugin](https://github.com/joleaf/obsidian-bpmn-plugin/actions/workflows/release.yml/badge.svg)](https://github.com/joleaf/obsidian-bpmn-plugin/actions/workflows/release.yml) ![GitHub all releases](https://img.shields.io/github/downloads/joleaf/obsidian-bpmn-plugin/total)

This plugin lets you view BPMN models interactively in [Obsidian](https://www.obsidian.md).
Based on the [bpmn-js](https://github.com/bpmn-io/bpmn-js) library.

## How to install

1. Go to **Community Plugins** in your [Obsidian](https://www.obsidian.md) Settings and **disable** Safe Mode
2. Click on **Browse** and search for "Obsidian BPMN Plugin"
3. Click install
4. Toggle the plugin on in the **Community Plugins** tab

## How to use

1. Add a valid `*.bpmn` file to your vault (e.g., `my-diagram.bpmn`) (e.g., modeled with
   the [Camunda Modeler](https://camunda.com/de/download/modeler/))
2. Add the BPMN diagram to your note:

````
```bpmn
{
  "url": "[[my-diagram.bpmn]]"
}
```
````

### Parameter

| Parameter   | Description                                    | Values                                                    |
|-------------|------------------------------------------------|-----------------------------------------------------------|
| url         | The url of the *.bpmn file.                    | Relative/Absolute path, or "[[*.bpmn]]" as markdown link. |
| height      | The height of the rendered canvas.             | [200..1000]                                               |
| opendiagram | Show a link to the *.bpmn file.                | true/false                                                |
| zoom        | Set the zoom level. Default is 'fit-viewport'. | 0.0 - 10.0                                                |
| x           | Set the x coordinate, if a zoom value is set.  | 0 - ... (default: 0)                                      |
| y           | Set the y coordinate, if a zoom value is set.  | 0 - ... (default: 0)                                      |

### Example

![Example](example/obsidian-bpmn-plugin.gif)

## How to dev

1. Clone this repo into the plugin folder of a (non-productive) vault (`.obsidian/plugins/`)
2. `npm i`
3. `npm run dev`
4. Toggle the plugin on in the **Community Plugins** tab

## Donate

<a href='https://ko-fi.com/joleaf' target='_blank'><img height='35' style='border:0px;height:46px;' src='https://az743702.vo.msecnd.net/cdn/kofi3.png?v=0' border='0' alt='Buy Me a Coffee at ko-fi.com' />
