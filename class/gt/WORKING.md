# How D3 Graph Theory Works

This document explains the structure and working of D3 Graph Theory. It serves as a kickstarter for those who are looking to contribute to the repository.

D3 Graph Theory is a very simple client-side website. Functioning of its main components are explained below.

### 1. unit.html

This file provides the barebones structure where all the contents will be loaded. There are two main elements it contains:

- **`div#theory-area`:** the theory (text) of the unit is loaded here
- **`div#app-area`:** the visualization of the unit is loaded here

### 2. css/style.css

This stylesheet applies to `unit.html` irrespective of the content loaded into it. Gives an overall look to the page.

### 3. ch/

The content of D3 Graph Theory is broken into several *units* (or chapters). The `ch/` directory contains the visualizations for each unit. Visualization of a unit is contained in directory `ch/unit-name/`, which in turn contains following two files

- **`app.js`:** the visualization of the unit implemented using [d3.js v5](https://d3js.org/)
- **`app.css`:** styles specifically meant for this visualization

### 4. js/content.js

This file contains text-content and data of all the units in `json` format. The text-contents of each unit are minified and JSON-escaped.

### 5. js/control.js

This script is responsible for loading content into `unit.html`. URL of each unit is of the form `unit.html?unit-name`. The script extracts `unit-name` from query string and accordingly loads the text from `content.js` and visualizations from `ch/unit-name/`.