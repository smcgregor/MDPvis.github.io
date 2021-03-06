/**
 * Plot the starting charts.
 * @param {object} stats is the percentile statistics.
 * @param {string} name is the name of the variable.
 * @param {object} trajectories The trajectories whose percentiles will be plotted.
 */
function FanChart(stats, name, trajectories) {

  this.name = name;
  TemporalChart.call(this);

  // Which Percentiles should be plotted.
  var percentilesToPlot = [100, 90, 80, 70, 60];

  // Reference for closures
  var that = this;

  // Indicates whether the vis is currently displaying two
  // datasets in the comparison mode.
  this.intersected = false;

  // Set the height and width from the style of the div element
  var divWidth = 10/12 * $(window).width();
  var divHeight = 250;

  var margin = {top: 30, right: 90, bottom: 30, left: 10},
      width = divWidth - margin.left - margin.right,
      height = divHeight - margin.top - margin.bottom;

  var x = d3.scale.linear()
      .range([0, width]);

  var y = d3.scale.linear()
      .range([height, 0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("right");

  // Create all the areas
  var areas = [];
  percentilesToPlot.forEach(function(percentile) {
    var accessorStringTop = "percentile" + percentile;
    var accessorStringBottom = "percentile" + (100 - percentile);
    var currentArea = d3.svg.area()
      .x(function(d) {
        if(d[accessorStringTop] === undefined) {
          return x(d.eventNumber - 1); // No trajectories of full length may be displayed
        }
        return x(d.eventNumber); })
      .y0(function(d) {
        if( d[accessorStringTop] === undefined ) {
          return 0; // No trajectories of full length may be displayed
        }
        if(d[accessorStringTop] === d[accessorStringBottom]) {
          return y(d[accessorStringTop]) + 2;
        }
        return y(d[accessorStringTop]); })
      .y1(function(d) {
        if( d[accessorStringTop] === undefined ) {
          return 0; // No trajectories of full length may be displayed
        }
        return y(d[accessorStringBottom]); });
    areas.push(currentArea);
  });

  // Create the Bootstrap columns
  var DOMDiv = this.getDOMNode();
  var DOMRow = document.createElement("div");
  DOMRow.setAttribute("class", "row center-vertically");
  var DOMCol = document.createElement("div");
  DOMCol.setAttribute("class", "col-xs-10");
  DOMRow.appendChild(DOMCol);

  // Append the title or image
  if ( name.indexOf(".png") > 0 || name.indexOf(".jpg") > 0 || name.indexOf(".gif") > 0 ) {
    var img = document.createElement("img");
    img.setAttribute("src", MDPVis.server.dataEndpoint + "/" + name);
    img.setAttribute("class", "img-responsive");
    img.style["max-height"] = "250px";
    DOMRow.appendChild(img);
  } else {
    var DOMCol2 = document.createElement("div");
    DOMCol2.setAttribute("class", "col-xs-2");
    DOMCol2.style["font-size"] = "x-large";
    DOMCol2.textContent = name;
    DOMRow.appendChild(DOMCol2);
  }

  DOMDiv.appendChild(DOMRow);

  var svg = d3.select(DOMCol).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("class", "fan-chart")
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  x.domain([0, stats.length]);
  var domainMax = d3.max(stats, function(d){return d["percentile100"]});
  var domainMin = d3.min(stats, function(d){return d["percentile0"]});
  domainMax = Math.ceil(domainMax);
  domainMin = Math.floor(domainMin);
  y.domain([domainMin, domainMax]);

  that.paths = [];
  percentilesToPlot.forEach(function(percentile, idx){
    var currentPath = svg.append("path")
        .datum(stats)
        .attr("class", "area fan_percentile" + percentile)
        .attr("d", areas[idx])
        .style("display", "none");
    that.paths.push(currentPath);
  });

  var xAxisG = svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  var yAxisG = svg.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + (divWidth - margin.right - margin.left) + "," + 0 + ")")
      .call(yAxis);

  var lineColor = d3.scale.category20();

  // Centerline for when in comparison mode
  var centerLine = svg.append("line")
    .attr("x1", 0)
    .attr("y1", y(0))
    .attr("x2", width)
    .attr("y2", y(0))
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "5, 20")
    .attr("stroke", "black")
    .style("display", "none");

  /**
   * Set the scale of the y axis to the proper extent.
   * @param {int} scaleMin The minimum of the y axis scale.
   * @param {int} scaleMax The maximum of the y axis scale.
   */
  function rescaleYAxis(scaleMin, scaleMax) {
    y.domain([scaleMin, scaleMax]);
    yAxis.scale(y);
    yAxisG.transition().duration(1000).call(yAxis);
  }

  /**
   * Update the path when the statistics change.
   * @param {object} statistics The stats object containing the
   * percentiles.
   * @param {boolean} isNewData indicates whether the data is new
   * or it was just filtered.
   */
  this.updateData = function(statistics, isNewData) {

    $(".change-chart-type").show();

    var percentiles = statistics.percentiles[that.name];

    stats = percentiles;

    // Hide the centerline from comparison mode
    centerLine.style("display", "none");

    var newDomainMax = d3.max(percentiles, function(d){return d["percentile100"]});
    var newDomainMin = d3.min(percentiles, function(d){return d["percentile0"]});
    var rescale = x.domain()[1] !== percentiles.length;

    if ( rescale || that.intersected || isNewData ) {
      that.intersected = false;
      domainMax = newDomainMax;
      domainMin = newDomainMin;
      rescaleYAxis(newDomainMin, newDomainMax);
      x.domain([0, percentiles.length]);
      xAxis.scale(x);

      xAxisG.transition().duration(1000).call(xAxis);
    }

    if ( data.filteredPrimaryTrajectories.length > 30 ) {
      that.linesAreDisplayed = false;
    }

    var pathDisplay = "";
    if( that.linesAreDisplayed ) {
      pathDisplay = "none";
    }
    that.paths.forEach(function(path, idx){
      path.datum(percentiles)
        .transition().duration(1000)
        .attr("d", areas[idx])
        .style("display", pathDisplay);
    });
    that.plotSliceSelectors();
    if( that.linesAreDisplayed ) {
      for( var i = 0; i < that.paths.length; i++ ) {
        that.paths[i].style("display", "none");
      }
      this.renderLines(data.filteredPrimaryTrajectories);
    } else {
      $("[data-line-name='" + name + "']").remove();
      $(".area").show();
    }
  };

  /**
   * Intersects data with a second dataset.
   * @param {object} comparatorStatistics The stats object containing percentiles we are intersecting with.
   */
  this.intersectWithSecondTrajectorySet = function(comparatorStatistics) {

    $(".change-chart-type").hide();

    that.intersected = true;

    var basePercentiles = data.primaryStatistics.percentiles[that.name];
    var comparatorPercentiles = comparatorStatistics.percentiles[that.name];

    $("[data-line-name='" + name + "']").remove();
    $(".area").show();

    var newScale = Math.max(basePercentiles.length, comparatorPercentiles.length);
    var minLength = Math.min(basePercentiles.length, comparatorPercentiles.length);
    var rescale = x.domain()[1] !== newScale;

    if( rescale ) {
      x.domain([0, newScale]);
      xAxis.scale(x);
      xAxisG.transition().duration(1000).call(xAxis);
    }

    var maxDistance = 0;
    for ( i = 0; i < minLength; i++ ) {
      maxDistance = Math.max(maxDistance,
        Math.abs(basePercentiles[i]["percentile100"] - comparatorPercentiles[i]["percentile100"]));
      maxDistance = Math.max(maxDistance,
        Math.abs(basePercentiles[i]["percentile0"] - comparatorPercentiles[i]["percentile0"]));
    }

    rescaleYAxis(-maxDistance, maxDistance);

    var diffsInPercentiles = [];
    for( var i = 0; i < basePercentiles.length; i++ ) {
      var cur = {eventNumber: i};
      for ( var j = 0; j < percentilesToPlot.length ; j++ ) {
        var upper = "percentile" + percentilesToPlot[j];
        var lower = "percentile" + (100 - percentilesToPlot[j]);
        cur[upper] = basePercentiles[i][upper] - comparatorPercentiles[i][upper];
        cur[lower] = basePercentiles[i][lower] - comparatorPercentiles[i][lower];
      }
      diffsInPercentiles.push(cur);
    }

    that.paths.forEach(function(path, idx){
      path.datum(diffsInPercentiles)
          .transition().duration(1000)
          .attr("d", areas[idx]);
    });

    // Show the line
    centerLine.style("display", "")
      .transition().duration(1000)
      .attr("y1", y(0))
      .attr("y2", y(0));

  };

  //
  // Section for brushes
  //

  /**
   * Show a histogram time slice of the Monte Carlo trajectories for the current variable name
   * and the selected time step.
   * @param timeStep
   */
  this.showSlice = function(timeStep) {
    var barChart = new BarChart(
      that.name,
      data.eligiblePrimaryTrajectories,
      timeStep);
    barChart.brushCounts();
    MDPVis.charts.sliceCharts[that.name] = barChart;
    var closeButton = $("<button type='button' class='btn' style='display: inline-block;'>Close Chart</button>");
    closeButton.on("click", function(){
      barChart.destroyChart();
      closeButton.remove();
      contextPanel.positionPanel();
    });
    $("#affixed-panel-charts")
        .empty()
        .append(barChart.getDOMNode())
        .append(closeButton);  //<span class="glyphicon glyphicon-minus" aria-hidden="true"></span>
    for( var i = 0; i < data.filters.activeFilters.length; i++ ) {
      if( data.filters.activeFilters[i].name === that.name && data.filters.activeFilters[i].timePeriod === timeStep ) {
        barChart.updateBrush(data.filters.activeFilters[i].extent);
      }
    }
    if ( that.intersected ) {
      barChart.intersectWithSecondTrajectorySet(data.eligibleSecondaryTrajectories);
    }
    contextPanel.showPanel(that);
  };

  /**
   * Plot rectangles for selecting the slices for a detail view.
   */
  this.plotSliceSelectors = function() {
    svg.selectAll("rect").remove();
    var timeStepCount = data.primaryStatistics.percentiles[that.name].length;
    for( var i = 0; i < timeStepCount; i++ ) {
      const j = i;
      svg.append("rect")
          .attr("class", "temporal_zoom")
          .attr("x", x(j))
          .attr("z", -1)
          .attr("width", width / timeStepCount - 1)
          .attr("height", divHeight)
          .on("click", function(){that.showSlice(j)});
    }
  };
  this.plotSliceSelectors();

  /**
   * Annotate the location of filters on the charts.
   *
   * @param {object} filters The filters we will use to annotate the chart.
   */
  this.updateBrushes = function() {
    function addBrushLine(yCoordinate, timePeriod) {
      svg.append("line")
          .attr("class", "temporal-brush-boundary")
          .attr("x1", x(timePeriod -.5))
          .attr("x2", x(timePeriod +.5))
          .attr("y1", y(yCoordinate))
          .attr("y2", y(yCoordinate))
          .attr("stroke", "gray")
          .attr("stroke-width", "5")
          .on("click", function(){
              data.filters.removeFilter(that.name, timePeriod);
              MDPVis.charts.updateAll();
          });
    }
    svg.selectAll(".temporal-brush-boundary").remove();
    for ( var i = 0; i < data.filters.activeFilters.length; i++ ) {
      var filter = data.filters.activeFilters[i];
      if( filter.name === that.name ) {
        var extent = filter.extent;
        var timePeriod = filter.timePeriod;
        addBrushLine(extent[0], timePeriod);
        addBrushLine(extent[1], timePeriod);
      }
    }
  };

  // Event handler for making requests for the state detail on clicking a line
  var lineClick = function(d, index) {
    if (d3.event.defaultPrevented) return;
    MDPVis.server.getState(d);
  };


  /**
   * Render lines for the active trajectories instead of the percentiles.
   *
   * When the number of active trajectories is small enough we can render the trajectories
   * instead of the percentiles.
   * @param {object} activeTrajectories The trajectories we want to render as lines.
   */
  this.renderLines = function(activeTrajectories) {
    $("[data-line-name='" + name + "']").remove();
    var line = d3.svg.line()
        .x(function(d, idx) { return x(idx); })
        .y(function(d) { return y(d[name]); });

    for(var i = 0; i < activeTrajectories.length; i++) {
      svg.append("path")
            .datum(activeTrajectories[i])
            .attr("class", "line state-detail hover_line")
            .attr("data-line-name", name)
            .attr("d", line)
            .style("stroke", function(d) {
              return lineColor(d[0]["Pathway Number"]); })
            .on("click", lineClick);
    }
  };

  that.linesAreDisplayed = true;
  if( trajectories.length <= 10 ) {
    that.linesAreDisplayed = false;
  }
  this.changeChartType = function(){
    var pathDisplay = "none";
    if ( that.linesAreDisplayed ) {
      pathDisplay = "";
      $("[data-line-name='" + that.name + "']").remove();
      that.linesAreDisplayed = false;
    } else {
      that.renderLines(data.filteredPrimaryTrajectories);
      that.linesAreDisplayed = true
    }
    for( var i = 0; i < that.paths.length; i++ ) {
      that.paths[i].attr("data-chart-name", that.name);
      that.paths[i].style("display", pathDisplay);
    }
  };
  that.changeChartType();

  return this;

}
