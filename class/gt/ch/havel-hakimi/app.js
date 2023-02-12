"use strict";
var nodes = [];

var links = [];

var problems = [
  [4, 3, 3, 2, 2],
  [5, 5, 5, 5, 5, 5],
  [5, 5, 4, 4, 3, 2, 1],
  [6, 5, 3, 3, 3, 2, 2],
  [5, 4, 4, 4, 3, 2, 2],
  [6, 5, 4, 4, 3, 3, 2, 1],
  [7, 5, 5, 4, 3, 3, 3, 1, 1],
  [8, 6, 4, 4, 3, 2, 2, 1, 1, 1],
  [8, 7, 7, 6, 5, 5, 4, 3, 2, 2, 1],
  [9, 7, 7, 7, 6, 5, 4, 3, 3, 2, 1],
  [8, 8, 7, 7, 6, 5, 5, 5, 4, 3, 3, 1],
  [8, 8, 8, 7, 7, 6, 6, 5, 5, 4, 4]
];

//universal width and height let index.html control svg dimensions when needed
var currentProb = 0,
  lastNodeId = 1;
var w = univSvgWidth ? univSvgWidth : 616,
  h = univSvgHeight ? univSvgHeight : 400,
  rad = 12;

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
  .force("link", d3.forceLink().distance(100))
  .force("x", d3.forceX(w / 2))
  .force("y", d3.forceY(h / 2))
  .on("tick", tick);

force.nodes(nodes);
force.force("link").links(links);

var colors = d3.schemeCategory10;

var mousedownNode = null;

d3.select("#clear-edges").on("click", function() {
  setGraph(currentProb);
});

d3.select("#prev-prob").on("click", function() {
  if (currentProb != 0) setGraph(--currentProb);
});

d3.select("#next-prob").on("click", function() {
  if (currentProb < problems.length - 1) setGraph(++currentProb);
});

var paginationLinks = d3.select("#prob-list");

paginationLinks.selectAll("a").on("click", function(d, i) {
  if (i < problems.length) setGraph(i);
});

//set initial positions for quick convergence
function positionNodes() {
  nodes.forEach(function(d, i) {
    d.y = (w / lastNodeId) * i;
    if (i % 2 == 0) d.x = d.y;
    else d.x = w - d.y;
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

  //here vertices are g.vertex elements
  vertices.attr("transform", function(d) {
    return "translate(" + d.x + "," + d.y + ")";
  });
}

function removeEdge(d, i) {
  // d.source.degree--;
  // d.target.degree--;
  d.source.targetDegree++;
  d.target.targetDegree++;
  links.splice(links.indexOf(d), 1);
  d3.event.preventDefault();
  restart();
}

function beginDragLine(d) {
  //event must propagate till g.vertex so that force.drag could work
  //stop propagation at .vertex in restart() so that addNode isn't fired

  //to prevent dragging of svg in firefox
  d3.event.preventDefault();
  if (d3.event.ctrlKey || d3.event.button != 0) return;
  if (d.targetDegree == 0) return;
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

//no need to call hideDragLine in endDragLine
//mouseup on vertices propagates to svg which calls hideDragLine
function endDragLine(d) {
  if (!mousedownNode || mousedownNode === d) return;
  if (d.targetDegree == 0) return;
  //return if link already exists
  for (var i = 0; i < links.length; i++) {
    var l = links[i];
    if (
      (l.source === mousedownNode && l.target === d) ||
      (l.source === d && l.target === mousedownNode)
    ) {
      return;
    }
  }
  // mousedownNode.degree++;
  // d.degree++;
  mousedownNode.targetDegree--;
  d.targetDegree--;
  var newLink = { source: mousedownNode, target: d };
  links.push(newLink);
  checkAndLoad();
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
  edges = edges.data(links, function(d) {
    return "v" + d.source.id + "-v" + d.target.id;
  });
  edges.exit().remove();

  var ed = edges
    .enter()
    .append("line")
    .attr("class", "edge")
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

  vertices.selectAll("text").text(function(d) {
    return d.targetDegree;
  });

  vertices.selectAll("circle").attr("r", function(d) {
    return rad + 2 * d.targetDegree;
  });

  var g = vertices
    .enter()
    .append("g")
    .attr("class", "vertex");

  g.append("circle")
    .attr("r", function(d) {
      return rad + 2 * d.targetDegree;
    })
    .style("fill", function(d, i) {
      return colors[d.id % 10];
    })
    .on("mousedown", beginDragLine)
    .on("mouseup", endDragLine)
    .append("title")
    .text(function(d) {
      return "v" + d.id;
    });

  g.append("text")
    .attr("x", 0)
    .attr("y", 4)
    .text(function(d) {
      return d.targetDegree;
    });

  vertices = g.merge(vertices);

  force.nodes(nodes);
  force.force("link").links(links);
  force.alpha(0.8).restart();
}

//further interface
svg
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
setGraph(0);

function setGraph(index) {
  currentProb = index;
  var degrees = problems[index];
  //remove current nodes and update
  nodes.splice(0);
  links.splice(0);
  restart();
  //create nodes and push
  degrees.forEach(function(val, i) {
    nodes.push({ id: i + 1, targetDegree: val });
  });
  lastNodeId = degrees.length;
  positionNodes();
  restart();
  //style prev and next
  if (index == 0) {
    $("#prev-prob").addClass("hidden");
    $("#next-prob").removeClass("hidden");
  } else if (index == problems.length - 1) {
    $("#prev-prob").removeClass("hidden");
    $("#next-prob").addClass("hidden");
  } else {
    $("#prev-prob").removeClass("hidden");
    $("#next-prob").removeClass("hidden");
  }
  //set a.prob-current
  paginationLinks.select(".prob-current").classed("prob-current", false);

  paginationLinks.selectAll("a").each(function(d, i) {
    if (i == index) d3.select(this).classed("prob-current", true);
  });
}

//checks if all targetDegrees are zero
//if yes then load next problem
function checkAndLoad() {
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].targetDegree != 0) return;
  }
  //set currentProb as solved
  paginationLinks.selectAll("a").each(function(d, i) {
    if (i == currentProb) d3.select(this).classed("prob-solved", true);
  });
  //load next problem with delay of 1s
  if (currentProb < problems.length - 1) {
    setTimeout(function() {
      setGraph(++currentProb);
    }, 2500);
  }
}
