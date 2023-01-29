"use strict";
//node ids are in order in which nodes come in existence
var nodes = [
  { id: 1 },
  { id: 2 },
  { id: 3 },
  { id: 4 },
  { id: 5 },
  { id: 6 },
  { id: 7 }
];

var links = [
  { source: 0, target: 1 },
  { source: 0, target: 2 },
  { source: 1, target: 3 },
  { source: 1, target: 4 },
  { source: 2, target: 5 },
  { source: 3, target: 6 }
];

//universal width and height let index.htm control svg dimensions when needed
var lastNodeId = nodes.length;
var w = univSvgWidth ? univSvgWidth : 616,
  h = univSvgHeight ? univSvgHeight : 400,
  rad = 10;

positionNodes();

var svg = d3
  .select("#svg-wrap")
  .append("svg")
  .attr("width", w)
  .attr("height", h);

var dragLine = svg
  .append("path")
  .attr("class", "dragLine hidden")
  .attr("d", "M0,0L0,0");

var edges = svg.append("g").selectAll(".edge");

var vertices = svg.append("g").selectAll(".vertex");

var force = d3
  .forceSimulation()
  .force(
    "charge",
    d3
      .forceManyBody()
      .strength(-300)
      .distanceMax((w + h) / 2)
  )
  .force(
    "link",
    d3
      .forceLink()
      .distance(80)
      .strength(0.9)
  )
  .force("x", d3.forceX(w / 2).strength(0.1))
  .force("y", d3.forceY(h / 2).strength(0.1))
  .on("tick", tick);

var colors = d3.schemeCategory10;

var mousedownNode = null;

d3.select("#clear-graph").on("click", clearGraph);

//empties the graph
function clearGraph() {
  nodes.splice(0);
  links.splice(0);
  lastNodeId = 0;
  restart();
  showGraphLatex();
}

function positionNodes() {
  nodes.forEach(function(d, i) {
    d.x = d.y = (i * w) / lastNodeId;
  });
}

//update the simulation
function tick() {
  edges
    .attr("x1", function(d) {
      return d.source.x;
    })
    .attr("y1", function(d) {
      return d.source.y;
    })
    .attr("x2", function(d) {
      return d.target.x;
    })
    .attr("y2", function(d) {
      return d.target.y;
    });

  vertices
    .attr("cx", function(d) {
      return d.x;
    })
    .attr("cy", function(d) {
      return d.y;
    });
}

function addNode() {
  var e = d3.event;
  if (e.button == 0) {
    var coords = d3.mouse(e.currentTarget);
    var newNode = { x: coords[0], y: coords[1], id: ++lastNodeId };
    nodes.push(newNode);
    restart();
    showGraphLatex();
  }
}

function removeNode(d, i) {
  var e = d3.event;
  //to make ctrl-drag works for mac/osx users
  if (e.ctrlKey) return;
  nodes.splice(nodes.indexOf(d), 1);
  var linksToRemove = links.filter(function(l) {
    return l.source === d || l.target === d;
  });
  linksToRemove.map(function(l) {
    links.splice(links.indexOf(l), 1);
  });
  e.preventDefault();
  restart();
  showGraphLatex();
}

function removeEdge(d, i) {
  links.splice(links.indexOf(d), 1);
  d3.event.preventDefault();
  restart();
  showGraphLatex();
}

function beginDragLine(d) {
  var e = d3.event;
  //to prevent call of addNode through svg
  e.stopPropagation();
  //to prevent dragging of svg in firefox
  e.preventDefault();
  if (e.ctrlKey || e.button != 0) return;
  mousedownNode = d;
  dragLine
    .classed("hidden", false)
    .attr(
      "d",
      "M" +
        mousedownNode.x +
        "," +
        mousedownNode.y +
        "L" +
        mousedownNode.x +
        "," +
        mousedownNode.y
    );
}

function updateDragLine() {
  if (!mousedownNode) return;
  var coords = d3.mouse(d3.event.currentTarget);
  dragLine.attr(
    "d",
    "M" +
      mousedownNode.x +
      "," +
      mousedownNode.y +
      "L" +
      coords[0] +
      "," +
      coords[1]
  );
}

function hideDragLine() {
  dragLine.classed("hidden", true);
  mousedownNode = null;
  restart();
}

//no need to call hideDragLine() and restart() in endDragLine
//mouseup on vertices propagates to svg which calls hideDragLine
function endDragLine(d) {
  if (!mousedownNode || mousedownNode === d) return;
  //return if link already exists
  for (let i = 0; i < links.length; i++) {
    var l = links[i];
    if (
      (l.source === mousedownNode && l.target === d) ||
      (l.source === d && l.target === mousedownNode)
    ) {
      return;
    }
  }
  var newLink = { source: mousedownNode, target: d };
  links.push(newLink);
  showGraphLatex();
}

//one response per ctrl keydown
var lastKeyDown = -1;

function keydown() {
  d3.event.preventDefault();
  if (lastKeyDown !== -1) return;
  lastKeyDown = d3.event.key;

  if (lastKeyDown === "Control") {
    vertices.call(
      d3
        .drag()
        .on("start", function dragstarted(d) {
          if (!d3.event.active) force.alphaTarget(1).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", function(d) {
          d.fx = d3.event.x;
          d.fy = d3.event.y;
        })
        .on("end", function(d) {
          if (!d3.event.active) force.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );
  }
}

function keyup() {
  lastKeyDown = -1;
  if (d3.event.key === "Control") {
    vertices.on("mousedown.drag", null);
  }
}

//updates the graph by updating links, nodes and binding them with DOM
//interface is defined through several events
function restart() {
  force.nodes(nodes);
  force.force("link").links(links);

  edges = edges.data(links, function(d) {
    return "v" + d.source.id + "-v" + d.target.id;
  });
  edges.exit().remove();

  var ed = edges
    .enter()
    .append("line")
    .attr("class", "edge")
    .on("mousedown", function() {
      d3.event.stopPropagation();
    })
    .on("contextmenu", removeEdge);

  ed.append("title").text(function(d) {
    return "v" + d.source.id + "-v" + d.target.id;
  });

  edges = ed.merge(edges);

  //vertices are known by id
  vertices = vertices.data(nodes, function(d) {
    return d.id;
  });
  vertices.exit().remove();

  var ve = vertices
    .enter()
    .append("circle")
    .attr("r", rad)
    .attr("class", "vertex")
    .style("fill", function(d, i) {
      return colors[d.id % 10];
    })
    .on("mousedown", beginDragLine)
    .on("mouseup", endDragLine)
    .on("contextmenu", removeNode);

  ve.append("title").text(function(d) {
    return "v" + d.id;
  });

  vertices = ve.merge(vertices);

  force.alpha(0.6).restart();
}

//further interface
svg
  .on("mousedown", addNode)
  .on("mousemove", updateDragLine)
  .on("mouseup", hideDragLine)
  .on("contextmenu", function() {
    d3.event.preventDefault();
  })
  .on("mouseleave", hideDragLine);

d3.select(window)
  .on("keydown", keydown)
  .on("keyup", keyup);

restart();
showGraphLatex();

function checkCycle() {
  nodes.forEach(function(v) {
    v.visited = false;
  });

  //construct adjacency list of graph
  //vis keeps track of visited node ids
  var adjList = {},
    vis = {},
    parent = {};
  nodes.forEach(function(v) {
    adjList[v.id] = [];
    vis[v.id] = false;
  });
  links.forEach(function(e) {
    adjList[e.source.id].push(e.target.id);
    adjList[e.target.id].push(e.source.id);
  });

  //perform DFS on nodes
  var q = [nodes[0].id];
  //-1 means root
  parent[nodes[0].id] = -1;
  var v1, v2;

  while (q.length > 0) {
    v1 = q.shift();
    vis[v1] = true;
    for (let i = 0; i < adjList[v1].length; i++) {
      v2 = adjList[v1][i];
      if (vis[v2] && parent[v1] != v2) return true;
      if (!vis[v2]) {
        q.push(v2);
        parent[v2] = v1;
      }
    }

    //check for other components
    if (q.length == 0) {
      for (let v in vis) {
        if (!vis[v]) {
          q.push(v);
          parent[v] = -1;
          break;
        }
      }
    }
  } //while ends here

  return false;
}

//handling output area
function showGraphLatex() {
  var l = "";

  if (nodes.length == 0) l = "\\[\\text{Null Graph. Draw something.}\\]";
  else if (checkCycle()) l = "\\[\\text{There is cycle. Remove it.}\\]";
  else if (nodes.length == links.length + 1)
    l =
      "\\[\\text{It's a tree with } |V|=" +
      nodes.length +
      ", |E|=" +
      links.length +
      "\\]";
  else l = "\\[\\text{This is a forest.}\\]";

  document.getElementById("svg-output").textContent = l;
  //recall mathjax
  MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
}
