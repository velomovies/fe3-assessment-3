//This code is based on http://bl.ocks.org/phil-pedruco/9344373 by Phil Pedruco. I created my own version of it and added some code.

var width = 650,
  height = 450,
  widthBar = 810

//Setting a scale for showing the correct colors in the map.
var x = d3.scaleLinear()
  .domain([1, 10])
  .rangeRound([600, 650])

//40 different colors (a gradient) made with a little tool. http://www.perbang.dk/rgbgradient/
//I could use color sets from d3, but the problem is that it had far less values
var colorArray = ["#0007BD", "#060DBE", "#0D13C0", "#131AC2", "#1A20C3", "#2026C5", "#272DC7", "#2D33C8", "#3439CA", "#3A40CC", "#4146CD", "#474CCF", "#4E53D1", "#5559D3", "#5B60D4", "#6266D6", "#686CD8", "#6F73D9", "#7579DB", "#7C7FDD", "#8286DE", "#898CE0", "#8F92E2", "#9699E3", "#9C9FE5", "#A3A5E7", "#AAACE9", "#B0B2EA", "#B7B9EC", "#BDBFEE", "#C4C5EF", "#CACCF1", "#D1D2F3", "#D7D8F4", "#DEDFF6", "#E4E5F8", "#EBEBF9", "#F1F2FB", "#F8F8FD", "#E9EBFD"]

//Setting up a color with the right scale.
var colour = d3.scaleThreshold()
  .domain(d3.range(0, 40))
  .range(colorArray.reverse())

//For making the map of the netherlands.
var projection = d3.geoMercator()
  .scale(1)
  .translate([0, 0])

//This variable is later used to draw the map of the Netherlands.
var path = d3.geoPath()
  .projection(projection)

//Making an SVG. Used put the chart inside. The attributes giving it a width and height.
var svg = d3.select("body").append("svg")
  .attr("width", width)
  .attr("height", height)

//Setting up another svg so that I can make another graph. I could have used the same svg as above, but that makes selecting difficult.
var svg2 = d3.select("body").append("svg")
  .attr("width", widthBar)
  .attr("height", height)

//Loading the csv from CBS as an text so I can clean it
d3.text("index.csv")
  .get(onload)

//When the csv is loaded it will start a function for cleaning it
function onload(err, doc) {
  if (err) throw err

//Start the clean up. This is based on the code from the cleaning example.
  var header = doc.indexOf("Vervoerwijzen")
  doc = doc.slice(header)
  end = doc.indexOf("\n", doc)
  doc = doc.slice(end).trim()
  doc = doc.replace(/"+/g, "").replace(/;+/g, ",")
  end = doc.indexOf("�")
  doc = doc.substring(0, end).trim()
  data = d3.csvParseRows(doc, map)

//After you parse the rows it checks if it has data. When there is no data it will not show anything. Next to that it gives all the data a usefull name.
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

//When the data is cleaned I nest it so I can use it in different ways. This is usefull because of the two different charts.
  loc = d3.nest()
    .key(function(d) {
      return d.location
    })
    .entries(data)

//Above I order by location and below I order by way of transport. This is usefull for later in the code.
  trans = d3.nest()
    .key(function(d) {
      return d.transport
    })
    .entries(data)

//Next to the data of CBS, there is a dataset for making the different provinces.
  d3.json("nld.json", function(error, nld) {

//Before anything happens I select the selection tool. So I can easily check what year is selected.
    var sel = document.getElementById("yearSelect")
    var dropSelect = d3.select("select")
    dropSelect.on("change", reset)

//For making the map there are a few difficult calculations. The json dataset is used to draw the chart.
    var netherland = topojson.feature(nld, nld.objects.subunits).features[3],
      pathNetherland = path.bounds(netherland),
      scaleChart = .2 / Math.max((pathNetherland[1][0] - pathNetherland[0][0]) / width, (pathNetherland[1][1] - pathNetherland[0][1]) / height),
      translateChart = [(width - scaleChart * (pathNetherland[1][0] + pathNetherland[0][0])) / 2, (height - scaleChart * (pathNetherland[1][1] + pathNetherland[0][1])) / 2]

//Setting the projection. So the map will draw in correct order
    projection
      .scale(scaleChart)
      .translate(translateChart),

//Locations is a variable that stores the names of the provinces. That can be used to show later
    locations = nld.objects.subunits.geometries

//Here the legend for the map is made. I translated it to show it below the map. (default is above)
    svg.append("g").attr("transform", "translate(-375, 400)").selectAll("rect")
      .data(colour.range().map(function(d) {
        d = colour.invertExtent(d)
        if (d[0] == null) d[0] = x.domain()[0]
        if (d[1] == null) d[1] = x.domain()[1]
        return d
      }))
      .enter().append("rect")

//To show the legend in correct order I set a few attributes and used a fun transition when it is loaded.
        .attr("height", 10)
        .attr("x", function(d) { return x(d[0]) })
        .attr("transform", "translate(0, -10)")
          .transition()
          .delay(function(d, i) { return i * 10 })
          .duration(500)
        .attr("width", function(d) {
          if (x(d[1]) - x(d[0]) > 0) {
            return x(d[1]) - x(d[0])
          }
        })
        .style("fill", function(d) { return colour(d[0]) })
        .attr("transform", "translate(0, 0)")

//When the legend is made it has no labels. With calling an axis it will show the correct labels.
    svg.select("g").call(d3.axisBottom(x)
        .tickSize(11)

//I set my own format so it shows the correct data.
        .tickFormat(function(d, i) {
          if (d > 1) {
            return (d + 1) + " miljard kilometer"
          } else {
            return d + " kilometer"
          }
        })

//It will show labels for the points that are highlighted here. I set it to the begin and the end of the legend.
        .tickValues([0, 39]))
      .select(".domain")
      .remove()

//With selecting a path and appending a g it is the beginning of drawing the map.
    svg.selectAll("path")

//The dataset is used to select the map in good order.
      .data(topojson.feature(nld, nld.objects.subunits).features).enter()
      .append("g")
        .attr("class", function(d, i) { return d.properties.name })
      .append("path")
        .style("opacity", "0")

//When the map is drawn we can set a few attributes to show the map. Next to that I made a transition to make it more dynamic
    svg.selectAll("path")
        .transition()
        .delay(function(d, i) { return i * 50 })
        .duration(200)
      .attr("d", path)
      .style("stroke", "#000")
      .style("stroke-width", ".5")
      .style("opacity", "1")

//This is a function that will get the correct color to the correct province.
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

//This section is a hover. It will make sure the color changes so you can see where you are pointing. (Only for the map chart)
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

//Setting a empty data array so it can be used to store all data for the barchart.
    var data = []

//This code checks the values and returns the values in correct order in an array.
    for (var j = 0; j < trans.length; j++) {
      if (trans[j].key !== "Totaal") {
          data.push(trans[j].values[0].y2010)
      }
    }

//Setting a domain and range to make sure the chart will show up in correct order.
    var xChart = d3.scaleLinear()
      .domain([0, d3.max(data)])
      .range([0, 420])

//To see what data you are looking at, I made a title for above the barchart.
    svg2.attr("class", "chart")
      .append("text")
        .text("Heel Nederland")
        .attr("fill", "#000")
        .attr("transform", "translate(200, 20)")

//This section will draw the actual barchart. It gets the data array made above.
    svg2.attr("class", "chart").selectAll("rect")
      .data(data.sort(sortNumber))
      .enter()
      .append("g")
      .append("rect")
        .style("width", "0")
        .style("height", "40px")

  //When the elements are made in the HTML I give them attributes. Here I set the position, color and width of the chart.
        .attr("transform", function(d, i) { return "translate(200," + ((i + 1) * 41) + ")" })
          .transition()
          .delay(function(d, i) { return i * 100 })
          .duration(1000)
          .ease(d3.easeBounceOut)
        .style("width", function(d) { return (xChart(d) * 1) + "px" })
        .style("fill", function(d, i) { return colour(i + 25) })

//To make sure the user can see details, I made a title that shows when you are hovering over.
    svg2.selectAll("rect")
      .append("title")
        .text(function(d, i) { return trans[i + 1].key + ": " + d + " miljard kilometer" })

//For the values I made my own labels. Those labels have because of a few attributes the right position.
    svg2.selectAll("g")
      .append("text")
      .attr("class", "value")
      .attr("transform", function(d, i) { return "translate(" + (xChart(d) + 203) + "," + (((i + 1) * 41) + 25) + ")" })
        .text(function(d, i) { return d + " miljard kilometer" })

//This is the same as above. Only the text it will make is different.
    svg2.selectAll("g")
      .append("text")
      .attr("class", "travelWay")
      .attr("transform", function(d, i) { return "translate(190," + (((i + 1) * 41) + 25) + ")" })
        .text(function(d, i) { return trans[i + 1].key })

//This section is a hover. It will make sure the color changes so you can see where you are pointing. (Only for the barchart)
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

//When a province is clicked it will fire an update to see the correct data in the chart.
    svg.selectAll("path").attr("class", "").on("click", updateChart)

//Updating the charts
    function updateChart(d, i) {

//I will make a second data array so you can reset easily to the old one.
      data2 = []

//First I remove all classes so no province is active. After that I add a class to the selected province so that you can see what data you are watching.
      svg.selectAll("path").attr("class", "")
      d3.select(this).attr("class", "active")

//To see if there is data in the dataset.
      function locationCheck() {
        if (d.properties) {
          return d.properties.name + " (PV)"
        }
      }

//In this section I connect the two data sets to eachother so it shows the correct data with the correct province.
      loc.forEach(function(dataLoc) {
        if (dataLoc.key == locationCheck()) {
          for (var j = 0; j < trans.length; j++) {
            if (dataLoc.values[j].transport !== "Totaal") {

//To see the corrct data it first will check what value is selected.
              if(sel.value == 2010) {
                data2.push(dataLoc.values[j].y2010)
              } else if(sel.value == 2011) {
                data2.push(dataLoc.values[j].y2011)
              } else if(sel.value == 2012) {
                data2.push(dataLoc.values[j].y2012)
              } else if(sel.value == 2013) {
                data2.push(dataLoc.values[j].y2013)
              } else if(sel.value == 2014) {
                data2.push(dataLoc.values[j].y2014)
              } else if(sel.value == 2015) {
                data2.push(dataLoc.values[j].y2015)
              }
            }
          }
        }
      })

//Here it updates the name above the barchart, so the user knows what data he is looking at.
      svg2.attr("class", "chart")
        .select("text")
          .text(d.properties.name)

//Using the new dataset (data2) I connect the data to the chart and update it together with a nice transition.
      svg2.attr("class", "chart").selectAll("rect")
        .data(data2.sort(sortNumber))
          .transition()
          .delay(function(d, i) { return i * 100 })
          .duration(1000)
          .ease(d3.easeBounceOut)
        .style("width", function(d) { return ((xChart(d)) * 4) + "px" })

//Not only the width has to update also the text uses with as title has to update.
      svg2.selectAll("rect")
        .select("title")
        .text(function(d, i) {
          return trans[i + 1].key + ": " + d + " miljard kilometer"
        })

//Next to the title the labels have to update too.
      svg2.selectAll("g")
      .data(data2.sort(sortNumber))
        .select(".value")
          .transition()
          .duration(1000)
          .ease(d3.easeBounceOut)
          .delay(function(d, i) { return i * 100 })

//This will show you the correct data. When the data is 0 it will show another message.
        .attr("transform", function(d, i) { return "translate(" + (xChart(d) * 4 + 203) + "," + (((i + 1) * 41) + 25) + ")" })
          .text(function(d, i) { if(d == 0) { return "geen"} else { return d + " miljard kilometer" }})
    }

//For setting the whole chart to the first state I made an on("click") that will start the function reset.
    d3.select("h1").on("click", reset)

//The function is almost the same as th initial set up of the chart
    function reset() {

//By using the data array again I will counteract that the wrong data is used.
      var data = []

//The same as earlier, but this time it is for the data array.
      for (var j = 0; j < trans.length; j++) {
        if (trans[j].key !== "Totaal") {
          if(sel.value == 2010) {
            data.push(trans[j].values[0].y2010)
          } else if(sel.value == 2011) {
            data.push(trans[j].values[0].y2011)
          } else if(sel.value == 2012) {
            data.push(trans[j].values[0].y2012)
          } else if(sel.value == 2013) {
            data.push(trans[j].values[0].y2013)
          } else if(sel.value == 2014) {
            data.push(trans[j].values[0].y2014)
          } else if(sel.value == 2015) {
            data.push(trans[j].values[0].y2015)
          }
        }
      }

//Updating the path with the correct attributes.
      svg.selectAll("path")
        .attr("class", "")
          .transition()
          .delay(function(d, i) { return i * 50 })
          .duration(200)

//This style element is really big because it has an check in it to see wich value is selected.
        .style("fill", function(d, i) {
          function locationCheck() {
            if (locations[i].properties) {
              return locations[i].properties.name + " (PV)"
            }
          }
          for (var k = 0; k < loc.length; k++) {
            if (loc[k].key == locationCheck()) {
              if(sel.value == 2010) {
                var color = loc[k].values[0].y2010
                return colour(color)
              } else if(sel.value == 2011) {
                var color = loc[k].values[0].y2011
                return colour(color)
              } else if(sel.value == 2012) {
                var color = loc[k].values[0].y2012
                return colour(color)
              } else if(sel.value == 2013) {
                var color = loc[k].values[0].y2013
                return colour(color)
              } else if(sel.value == 2014) {
                var color = loc[k].values[0].y2014
                return colour(color)
              } else if(sel.value == 2015) {
                var color = loc[k].values[0].y2015
                return colour(color)
              }
            }
          }
        })

//Update the text so it shows the user what they are looking at.
      svg2.attr("class", "chart")
        .select("text")
          .text("Heel Nederland")

//Next to the map it will also reset the whole barchart.
      svg2.attr("class", "chart").selectAll("rect")
        .data(data.sort(sortNumber))
          .transition()
          .duration(1000)
          .ease(d3.easeBounceOut)
          .delay(function(d, i) { return i * 100 })
        .style("width", function(d) { return (xChart(d) * 1) + "px" })
        .style("fill", function(d, i) { return colour(i + 25) })

//The title back to its original so the user can see in detail the correct details.
      svg2.selectAll("rect")
        .select("title")
          .text(function(d, i) { return trans[i + 1].key + ": " + d + " miljard kilometer" })

//Same as above. This makes sure the text is in the correct place. So that it is easily readable
      svg2.selectAll("g")
      .data(data.sort(sortNumber))
        .select("text")
          .transition()
          .duration(1000)
          .ease(d3.easeBounceOut)
          .delay(function(d, i) { return i * 100 })
        .attr("transform", function(d, i) { return "translate(" + (xChart(d) + 203) + "," + (((i + 1) * 41) + 25) + ")" })
          .text(function(d, i) { return d + " miljard kilometer" })
    }

//Here is a function that will make sure the data of the barchart will show in decreasing order. This makes it visualy more pleasing.
    function sortNumber(a, b) {
      return b - a
    }
  })
}
