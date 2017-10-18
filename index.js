//This code is based on link by someone. I created my own version of it and added some code.

var width = 960,
  height = 450,
  widthBar = 500

var x = d3.scaleLinear()
    .domain([1, 10])
    .rangeRound([600, 650])

//40 different colors (a gradient) made with a little tool. http://www.perbang.dk/rgbgradient/
var colorArray = ["#0007BD", "#060DBE", "#0D13C0", "#131AC2", "#1A20C3", "#2026C5", "#272DC7", "#2D33C8", "#3439CA", "#3A40CC", "#4146CD", "#474CCF", "#4E53D1", "#5559D3", "#5B60D4", "#6266D6", "#686CD8", "#6F73D9", "#7579DB", "#7C7FDD", "#8286DE", "#898CE0", "#8F92E2", "#9699E3", "#9C9FE5", "#A3A5E7", "#AAACE9", "#B0B2EA", "#B7B9EC", "#BDBFEE", "#C4C5EF", "#CACCF1", "#D1D2F3", "#D7D8F4", "#DEDFF6", "#E4E5F8", "#EBEBF9", "#F1F2FB", "#F8F8FD", "#E9EBFD"]

var colour = d3.scaleThreshold()
  .domain(d3.range(0, 40))
  .range(colorArray.reverse())

var projection = d3.geoMercator()
  .scale(1)
  .translate([0, 0])

var path = d3.geoPath()
  .projection(projection)

var svg = d3.select("body").append("svg")
  .attr("width", width)
  .attr("height", height)

var svg2 = d3.select("body").append("svg")
.attr("width", widthBar)
.attr("height", height)

d3.text("index.csv")
  .get(onload)

function onload(err, doc) {
  if (err) throw err

  var header = doc.indexOf("Vervoerwijzen")
  doc = doc.slice(header)
  end = doc.indexOf("\n", doc)
  doc = doc.slice(end).trim()
  doc = doc.replace(/"+/g, "").replace(/;+/g, ",")
  end = doc.indexOf("�")
  doc = doc.substring(0, end).trim()
  data = d3.csvParseRows(doc, map)

  function map(d, i) {
    if (d[1] == "" || d[2] == "" || d[3] == "" || d[4] == "" || d[5] == "" || d[6] == "" || d[7] == "") {
      return
    }
    return {
      transport: d[0],
      location: d[1],
      y2010: Number(d[2]),
      y2011: Number(d[3]),
      y2012: Number(d[4]),
      y2013: Number(d[5]),
      y2014: Number(d[6]),
      y2015: Number(d[7]),
    }
  }


  loc = d3.nest()
    .key(function(d) {
      return d.location
    })
    .entries(data)

  trans = d3.nest()
    .key(function(d) {
      return d.transport
    })
    .entries(data)

  d3.json("nld.json", function(error, nld) {

    var netherland = topojson.feature(nld, nld.objects.subunits).features[3],
      pathNetherland = path.bounds(netherland),
      scaleChart = .2 / Math.max((pathNetherland[1][0] - pathNetherland[0][0]) / width, (pathNetherland[1][1] - pathNetherland[0][1]) / height),
      translateChart = [(width - scaleChart * (pathNetherland[1][0] + pathNetherland[0][0])) / 2, (height - scaleChart * (pathNetherland[1][1] + pathNetherland[0][1])) / 2]

    projection
      .scale(scaleChart)
      .translate(translateChart),

      locations = nld.objects.subunits.geometries

      svg.append("g").attr("transform", "translate(-100, 0)").selectAll("rect")
        .data(colour.range().map(function(d) {
            d = colour.invertExtent(d)
            if (d[0] == null) d[0] = x.domain()[0]
            if (d[1] == null) d[1] = x.domain()[1]
            return d
          }))
        .enter().append("rect")
          .attr("height", 10)
          .attr("x", function(d) { return x(d[0]) })
          .attr("transform", "translate(0, -10)")
          .transition()
          .delay(function(d,i) { return i * 10 })
          .duration(500)
          .attr("width", function(d) { if(x(d[1]) - x(d[0]) > 0) {
            return x(d[1]) - x(d[0]) } })
          .style("fill", function(d) { return colour(d[0]) })
          .attr("transform", "translate(0, 0)")


          svg.select("g").call(d3.axisBottom(x)
              .tickSize(11)
              .tickFormat(function(d, i){ if (d > 1) { return (d + 1) + " miljard kilometer" } else { return d + " kilometer" }})
              .tickValues([0, 39]))
            .select(".domain")
              .remove();

    svg.selectAll("path")
      .data(topojson.feature(nld, nld.objects.subunits).features).enter()
      .append("g")
      .attr("class", function(d, i) {
        return d.properties.name
      })
      .append("path")
      .style("opacity", "0")

    svg.selectAll("path")
      .transition()
      .delay(function(d,i) { return i * 50})
      .duration(200)
      .attr("d", path)
      .style("stroke", "#000")
      .style("stroke-width", ".5")
      .style("opacity", "1")
      .style("fill", function(d, i) {
        function locationCheck() {
          if (locations[i].properties) {
            return locations[i].properties.name + " (PV)"
          }
        }
        for (var k = 0; k < loc.length; k++) {
          if (loc[k].key == locationCheck()) {
            var color = loc[k].values[0].y2010
            return colour(color)
          }
        }
      })

    svg.selectAll("path").on("mouseenter", function(d, i) {
      d3.select(this)
        .transition()
        .style("stroke", "#fff")
        .style("stroke-width", "1")
        .style("opacity", ".4")
    }).on("mouseout", function(d, i) {
      d3.select(this)
        .transition()
        .style("stroke", "#000")
        .style("stroke-width", ".5")
        .style("opacity", "1")
    })

    var data = []

    for (var j=0; j<trans.length; j++) {
      if(trans[j].key !== "Totaal") {
        data.push(trans[j].values[0].y2010)
      }
    }

    var xChart = d3.scaleLinear()
        .domain([0, d3.max(data)])
        .range([0, 420])

    svg2.attr("class", "chart")
    .append("text")
      .text("Heel Nederland")
      .attr("fill", "#000")
      .attr("transform", "translate(0, 20)")

    svg2.attr("class", "chart").selectAll("rect")
        .data(data.sort(sortNumber))
      .enter().append("rect")
        .style("width", "0")
        .style("height", "40px")
        .attr("transform", function(d, i) { return "translate(0," + ((i + 1) * 41) + ")" })
      .transition()
      .delay(function(d, i){ return i * 100 })
        .style("width", function(d) { return (xChart(d) * 1) + "px" })
        .style("fill", function(d, i) { return colour(i + 25) })

        svg2.selectAll("rect")
          .append("title")
            .text(function(d, i) { return trans[i+1].key + ": " + d + " miljard kilometer" })

        svg2.selectAll("rect").on("mouseenter", function(d, i) {
          d3.select(this)
            .transition()
            .style("opacity", ".4")
            .style("stroke-width", "1")
            .style("stroke", "#fff")
        }).on("mouseout", function(d, i) {
          d3.select(this)
            .transition()
            .style("opacity", "1")
            .style("stroke-width", ".5")
            .style("stroke", "#000")
        })

        svg.selectAll("path").attr("class", "").on("click", updateChart)

        function updateChart(d, i) {
          data2 = []
          svg.selectAll("path").attr("class", "")
          d3.select(this).attr("class", "active")
            function locationCheck() {
              if (d.properties) {
                return d.properties.name + " (PV)"
              }
            }
            loc.forEach(function(dataLoc) {
              if (dataLoc.key == locationCheck()) {
                for (var j=0; j<trans.length; j++) {
                  if(dataLoc.values[j].transport !== "Totaal") {
                    data2.push(dataLoc.values[j].y2010)
                  }
                }
              }
            })

            xChart = d3.scaleLinear()
                .domain([0, d3.max(data)])
                .range([0, 420])

            svg2.attr("class", "chart")
            .select("text")
              .text(d.properties.name)
              .attr("fill", "#000")
              .attr("transform", "translate(0, 20)")

            svg2.attr("class", "chart").selectAll("rect")
            .data(data2.sort(sortNumber)).transition().delay(function(d, i) { return i * 100 }).duration(1000).ease(d3.easeBounceOut)
            .style("width", function(d) { return ((xChart(d))*4) + "px" })

            svg2.selectAll("rect")
              .select("title")
                .text(function(d, i) { console.log(d)
                  return trans[i+1].key + ": " + d + " miljard kilometer" })
            }

        function sortNumber(a,b) {
            return b - a
        }
  })
}
