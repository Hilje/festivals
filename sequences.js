// Dimensions of sunburst.
var width = 750;
var height = 600;
var radius = Math.min(width, height) / 2;

// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
var b = {
  w: 150, h: 30, s: 3, t: 10
};

// Mapping of step names to colors.
var colorsByFestival = {
  "Lowlands": "#EF2C5B",
  "Pinkpop": "#4EC9CE",
  "Rock Werchter (inclusief Torhout)": "#D9E021",
  "Sziget": "#528485",
  "Pukkelpop": "#7DA3A4",
  "Best kept secret": "#471F46",
  "Concert at Sea": "#AE69BF",
  "Down the Rabbit Hole": "#B896C3",
  "Appelsap": "#232342",
  "Awakenings": "#232342", 
  "Bevrijdingsfestival": "#232342", 
  "Cactusfestival Brugge": "#232342", 
  "Eurosonic Noorderslag": "#232342", 
  "Fields of Rock": "#232342", 
  "Forta Rock XL": "#232342",
  "Freshtival": "#232342",
  "Glastonbury": "#232342",
  "Mysteryland": "#232342",
  "Nieuw Zaailand": "#232342",
  "Paaspop": "#232342",
  "Parkcity Live": "#232342",
  "Parkfeest": "#232342",
  "Parkpop": "#232342",
  "Trailerpop": "#232342",
  "Zwarte Cross": "#232342",
    
};

// Total size of all segments; we set this later, after loading the data.
var totalSize = 0; 

// visualisatie "vis" tekenen in de chart-id

var vis = d3.select("#chart").append("svg:svg")
    .attr("width", width)
    .attr("height", height)
    .append("svg:g")
    .attr("id", "container")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");


// zorgt er volgens mij voor dat het een sunburst wordt en niet b.v. een node diagram

var partition = d3.partition()
    .size([2 * Math.PI, radius * radius]);

var arc = d3.arc()
    .startAngle(function(d) { return d.x0; })
    .endAngle(function(d) { return d.x1; })
    .innerRadius(function(d) { return Math.sqrt(d.y0); })
    .outerRadius(function(d) { return Math.sqrt(d.y1); });

// Use d3.text and d3.csvParseRows so that we do not need to have a header
// row, and can receive the csv as an array of arrays.
//met de console kan je zien dat dit niet goed gaat, de file wordt niet gesplitst op de ;

//load the data file
  d3.text("data2.csv").then(function(text) {
    //create a semicolon parser
    var dsv = d3.dsvFormat(';');
    //use semicolon parser on loaded data file
    var csv = dsv.parse(text); 
    //build Json Hierarchy, see function below
    var json = csvToData(csv);
    console.log(json);

createVisualization(json);
});

// Main function to draw and set up the visualization, once we have the data.
function createVisualization(json) {

  // Basic setup of page elements.
  initializeBreadcrumbTrail();
  drawLegend();
  d3.select("#togglelegend").on("click", toggleLegend);

  // Bounding circle underneath the sunburst, to make it easier to detect
  // when the mouse leaves the parent g.
  vis.append("svg:circle")
    .attr("r", radius)
    .style("opacity", 0);

  // Turn the data into a d3 hierarchy and calculate the sums.
  var root = d3.hierarchy(json)
    .sum(function(d) { return d.size; })
    .sort(function(a, b) { return b.value - a.value; });
  
  // For efficiency, filter nodes to keep only those large enough to see.
  var nodes = partition(root).descendants()
    .filter(function(d) {
       return (d.x1 - d.x0 > 0.005); // 0.005 radians = 0.29 degrees
      })
  ;

  //tekent een pad op basis van de data
  console.log(json);
  var path = vis.data([json]).selectAll("path")
      .data(nodes)
      .enter().append("svg:path")
      .attr("display", function(d) { return d.depth ? null : "none"; })
      .attr("d", arc)
      .attr("fill-rule", "evenodd")
      .style("fill", function(d) {
        return d.color;
      })
       .style("opacity", 1)
      .on("mouseover", mouseover);

  // Add the mouseleave handler to the bounding circle.
  d3.select("#container").on("mouseleave", mouseleave);

  // Get total size of the tree = value of root node from partition.
  totalSize = path.datum().value;
 };



// Fade all but the current sequence, and show it in the breadcrumb trail.
function mouseover(d) {

  var percentage = (100 * d.value / totalSize).toPrecision(3);
  var percentageString = percentage + "%";
  if (percentage < 0.1) {
    percentageString = "< 0.1%";
  }
    
  d3.select("#percentage")
      .text(percentageString);

  d3.select("#explanation")
      .style("visibility", "");

  var sequenceArray = d.ancestors().reverse();
  sequenceArray.shift(); // remove root node from the array
  updateBreadcrumbs(sequenceArray, percentageString);

  // Fade all the segments.
  d3.selectAll("path")
      .style("opacity", 0.3);

  // Then highlight only those that are an ancestor of the current segment.
  vis.selectAll("path")
      .filter(function(node) {
                return (sequenceArray.indexOf(node) >= 0);
              })
      .style("opacity", 1);
}

// Restore everything to full opacity when moving off the visualization.
function mouseleave(d) {

  // Hide the breadcrumb trail
  d3.select("#trail")
      .style("visibility", "hidden");

  // Deactivate all segments during transition.
  d3.selectAll("path").on("mouseover", null);

  // Transition each segment to full opacity and then reactivate it.
  d3.selectAll("path")
      .transition()
      .duration(1000)
      .style("opacity", 1)
      .on("end", function() {
              d3.select(this).on("mouseover", mouseover);
            });

  d3.select("#explanation")
      .style("visibility", "hidden");
}

function initializeBreadcrumbTrail() {
  // Add the svg area.
  var trail = d3.select("#sequence").append("svg:svg")
      .attr("width", width)
      .attr("height", 50)
      .attr("id", "trail");
  // Add the label at the end, for the percentage.
  trail.append("svg:text")
    .attr("id", "endlabel")
    .style("fill", "#000");
}

// Generate a string that describes the points of a breadcrumb polygon.
function breadcrumbPoints(d, i) {
  var points = [];
  points.push("0,0");
  points.push(b.w + ",0");
  points.push(b.w + b.t + "," + (b.h / 2));
  points.push(b.w + "," + b.h);
  points.push("0," + b.h);
  if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
    points.push(b.t + "," + (b.h / 2));
  }
  return points.join(" ");
}

// Update the breadcrumb trail to show the current sequence and percentage.
function updateBreadcrumbs(nodeArray, percentageString) {

  // Data join; key function combines name and depth (= position in sequence).
  var trail = d3.select("#trail")
      .selectAll("g")
      .data(nodeArray, function(d) { return d.data.name + d.depth; });

  // Remove exiting nodes.
  trail.exit().remove();

  // Add breadcrumb and label for entering nodes.
  var entering = trail.enter().append("svg:g");

  entering.append("svg:polygon")
      .attr("points", breadcrumbPoints)
      .style("fill", function(d) { return d.color; });

  entering.append("svg:text")
      .attr("x", (b.w + b.t) / 2)
      .attr("y", b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function(d) { return d.data.name; });

  // Merge enter and update selections; set position for all nodes.
  entering.merge(trail).attr("transform", function(d, i) {
    return "translate(" + i * (b.w + b.s) + ", 0)";
  });

  // Now move and update the percentage at the end.
  d3.select("#trail").select("#endlabel")
      .attr("x", (nodeArray.length + 0.5) * (b.w + b.s))
      .attr("y", b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(percentageString);

  // Make the breadcrumb trail visible, if it's hidden.
  d3.select("#trail")
      .style("visibility", "");

}

function drawLegend() {

  // Dimensions of legend item: width, height, spacing, radius of rounded rect.
  var li = {
    w: 75, h: 30, s: 3, r: 3
  };

  var legend = d3.select("#legend").append("svg:svg")
      .attr("width", li.w)
      .attr("height", d3.keys(colorsByFestival).length * (li.h + li.s));

  var g = legend.selectAll("g")
      .data(d3.entries(colorsByFestival))
      .enter().append("svg:g")
      .attr("transform", function(d, i) {
              return "translate(0," + i * (li.h + li.s) + ")";
           });

  g.append("svg:rect")
      .attr("rx", li.r)
      .attr("ry", li.r)
      .attr("width", li.w)
      .attr("height", li.h)
      .style("fill", function(d) { return d.value; });

  g.append("svg:text")
      .attr("x", li.w / 2)
      .attr("y", li.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function(d) { return d.key; });
}

function toggleLegend() {
  var legend = d3.select("#legend");
  if (legend.style("visibility") == "hidden") {
    legend.style("visibility", "");
  } else {
    legend.style("visibility", "hidden");
  }
}

// data setup

var data = [];

function csvToData(csv) {


  var csvByFestival = d3.nest()
  .key(function(d) { return d.festival; })
  .entries(csv);
  console.log(csvByFestival);
  // Todo: is een eenvoudigere datastructuur mogelijk?
  //var data = { festival: "root", children: [] };

  for (var i = 0; i < csv.length; i++) {
    // One .csv row
    var row = csv[i];

    // Named values in the row
    var festival = row[0];
    var artist = row[1];
    var person = row[2];
    var year = row[3];
    var description = row[4];

    // Determine the color
    var festivalColor = colorsByFestival[festival];

    // Todo: code beneden is nu niet "dynamisch".
    //  Niveau extra/dieper niet mogelijk zonder extra code
    //  Wel eenvoudiger te begrijpen zo.

    // Check if there already is an entry for the festival
    var festivalEntry = data.children.find(function(entry) {
      return entry.name === festival;
    });

    // No festival entry yet, create one.
    if (!festivalEntry) {
      festivalEntry = {
        name: festival,
        color: festivalColor,
        children: []
      };
      
      data.children.push(festivalEntry);
    }

    // Check if there already is an entry for the artist
    var artistEntry = festivalEntry.children.find(function(entry) {
      return entry.name === artist;
    });
    if (!artistEntry) {
      artistEntry = {
        name: artist,
        color: festivalColor,
        children: []
      };

      festivalEntry.children.push(artistEntry);
    }

    // Check if there already is an entry for the person
    var personEntry = artistEntry.children.find(function(entry) {
      return entry.name === artist;
    });
    if (!personEntry) {
      artistEntry.children.push({
        name: person,
        color: festivalColor,
        year: year,
        description: description
      });
    }
  }
  return data;
}