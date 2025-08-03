document.addEventListener("DOMContentLoaded", function () {
  const chartContainer = d3.select("#q7_chart");
  const selector = document.getElementById("q7Selector");
  const toggle = document.getElementById("q7_category_toggle");

  d3.json("/static/data/q7_industrial_crime_trends.json").then((data) => {
    const stages = data.industrial_stages;

    drawOverallTrend();

    selector.addEventListener("change", () => {
      chartContainer.selectAll("*").remove();
      toggle.checked = false;
      if (selector.value === "total_trend") {
        document.getElementById("q7_toggle_container").style.display = "block";
        drawOverallTrend();
      } else if (selector.value === "crime_structure") {
        document.getElementById("q7_toggle_container").style.display = "none";
        drawStructure();
      } else if (selector.value === "age_structure") {
        document.getElementById("q7_toggle_container").style.display = "none";
        drawAgeStructure();
      }
    });

    // tick box
    toggle.addEventListener("change", () => {
      chartContainer.selectAll("*").remove();
      drawOverallTrend(toggle.checked);
    });

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("padding", "6px")
        .style("background", "rgba(0,0,0,0.7)")
        .style("color", "#fff")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("display", "none");

    function drawBackground(svg, x, width, height) {
      const colorScale = d3.scaleOrdinal()
        .domain(stages.map(d => d.name))
        .range(["#e0f7fa", "#ffe0b2", "#c8e6c9", "#f8bbd0"]);

      // background color block
      svg.selectAll(".period")
        .data(stages)
        .enter()
        .append("rect")
        .attr("x", d => x(d.start))
        .attr("width", d => x(d.end + 1) - x(d.start))
        .attr("y", 0)
        .attr("height", height)
        .attr("fill", d => colorScale(d.name))
        .attr("opacity", 0.4);

      // legend
      const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 10}, 0)`);

      stages.forEach((stage, i) => {
        const legendRow = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
        legendRow.append("rect")
          .attr("width", 15)
          .attr("height", 15)
          .attr("fill", colorScale(stage.name))
          .attr("opacity", 0.6);
        legendRow.append("text")
          .attr("x", 20)
          .attr("y", 12)
          .text(stage.name)
          .attr("font-size", "12px")
          .attr("fill", "#333");
      });
    }

    function drawLegend(svg, keys, color, chartWidth, offsetY = 0) {
      const legend = svg.append("g").attr("class", "legend").attr("transform", `translate(${chartWidth + 20}, ${offsetY})`);
      keys.forEach((key, i) => {
        const row = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
        row.append("rect").attr("width", 15).attr("height", 15)
          .attr("fill", color(key)).attr("opacity", 0.7);
        row.append("text").attr("x", 20).attr("y", 12)
          .text(key).attr("font-size", "12px").attr("fill", "#333");
      });
    }

    function drawOverallTrend(showCategory = false) {
      const margin = { top: 40, right: 160, bottom: 40, left: 35 };
      const width = 985 - margin.left - margin.right;
      const height = 400 - margin.top - margin.bottom;

      const svg = chartContainer.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const years = data.total_trend.map(d => d.year);
      const x = d3.scaleLinear()
        .domain(d3.extent(years))
        .range([0, width]);
      const y = d3.scaleLinear()
        .range([height, 0]);

      if (!showCategory) {
        const line = d3.line()
          .x(d => x(d.year))
          .y(d => y(d.count));

        y.domain([0, d3.max(data.total_trend, d => d.count)]);
        drawBackground(svg, x, width, height);

        svg.append("path")
          .datum(data.total_trend)
          .attr("fill", "none")
          .attr("stroke", "steelblue")
          .attr("stroke-width", 2)
          .attr("d", line);

        svg.selectAll("circle")
          .data(data.total_trend)
          .enter()
          .append("circle")
          .attr("cx", d => x(d.year))
          .attr("cy", d => y(d.count))
          .attr("r", 3)
          .attr("fill", "steelblue")
          .on("mouseover", (event, d) => {
            tooltip.html(`Year: ${d.year}<br>Count: ${d.count}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 30) + "px")
              .style("display", "block");
          })
          .on("mouseout", () => tooltip.style("display", "none"));
      } else {
        const stackedKeys = Object.keys(data.category_trend[0]).filter(k => k !== "year");
        const stackedData = d3.stack()
          .keys(stackedKeys)
          (data.category_trend);

        y.domain([0, d3.max(data.category_trend, d => {
          return stackedKeys.reduce((sum, k) => sum + d[k], 0);
        })]);

        drawBackground(svg, x, width, height);

        const color = d3.scaleOrdinal(d3.schemeCategory10);
        svg.selectAll("path")
          .data(stackedData)
          .enter()
          .append("path")
          .attr("fill", d => color(d.key))
          .attr("d", d3.area()
            .x(d => x(d.data.year))
            .y0(d => y(d[0]))
            .y1(d => y(d[1])))
          .on("mousemove", (event, d) => {
            const [mx] = d3.pointer(event);
            const year = Math.round(x.invert(mx));
            const matched = d.find(e => e.data.year === year);
            if (matched) {
              const value = matched[1] - matched[0];
              tooltip.html(`Year: ${year}<br>Category: ${d.key}<br>Count: ${value}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 30) + "px")
                .style("display", "block");
            }
          })
          .on("mouseout", () => tooltip.style("display", "none"));

        drawLegend(svg, stackedKeys, color, width - 10, 80);
      }

      svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
      svg.append("g").call(d3.axisLeft(y));
    }

    function drawStructure() {
      const margin = { top: 40, right: 160, bottom: 40, left: 35 };
      const width = 985 - margin.left - margin.right;
      const height = 400 - margin.top - margin.bottom;

      const svg = chartContainer.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const keys = Object.keys(data.structure_by_year[0]).filter(k => k !== "year");
      const stackedData = d3.stack()
        .keys(keys)(data.structure_by_year);

      const x = d3.scaleLinear()
        .domain(d3.extent(data.structure_by_year, d => d.year))
        .range([0, width]);

      const y = d3.scaleLinear()
        .domain([0, d3.max(data.structure_by_year, d => keys.reduce((sum, k) => sum + d[k], 0))])
        .range([height, 0]);

      drawBackground(svg, x, width, height);

      const color = d3.scaleOrdinal(d3.schemeCategory10);
      svg.selectAll("path")
        .data(stackedData)
        .enter()
        .append("path")
        .attr("fill", d => color(d.key))
        .attr("d", d3.area()
          .x(d => x(d.data.year))
          .y0(d => y(d[0]))
          .y1(d => y(d[1])))
        .on("mousemove", (event, d) => {
          const [mx] = d3.pointer(event);
          const year = Math.round(x.invert(mx));
          const matched = d.find(e => e.data.year === year);
          if (matched) {
            const value = matched[1] - matched[0];
            tooltip.html(`Year: ${year}<br>Type: ${d.key}<br>Count: ${value}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 30) + "px")
              .style("display", "block");
          }
        })
        .on("mouseout", () => tooltip.style("display", "none"));

        drawLegend(svg, keys, color, width - 10, 80);

      svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
      svg.append("g").call(d3.axisLeft(y));
    }

    function drawAgeStructure() {
      const margin = { top: 40, right: 160, bottom: 40, left: 35 };
      const width = 985 - margin.left - margin.right;
      const height = 400 - margin.top - margin.bottom;

      const svg = chartContainer.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const keys = Object.keys(data.age_structure[0]).filter(k => k !== "year");
      const stackedData = d3.stack()
        .keys(keys)(data.age_structure);

      const x = d3.scaleLinear()
        .domain(d3.extent(data.age_structure, d => d.year))
        .range([0, width]);

      const y = d3.scaleLinear()
        .domain([0, d3.max(data.age_structure, d => keys.reduce((sum, k) => sum + d[k], 0))])
        .range([height, 0]);

      drawBackground(svg, x, width, height);

      const color = d3.scaleOrdinal(d3.schemeTableau10);
      svg.selectAll("path")
        .data(stackedData)
        .enter()
        .append("path")
        .attr("fill", d => color(d.key))
        .attr("d", d3.area()
          .x(d => x(d.data.year))
          .y0(d => y(d[0]))
          .y1(d => y(d[1])))
        .on("mousemove", (event, d) => {
          const [mx] = d3.pointer(event);
          const year = Math.round(x.invert(mx));
          const matched = d.find(e => e.data.year === year);
          if (matched) {
            const value = matched[1] - matched[0];
            tooltip.html(`Year: ${year}<br>Group: ${d.key}<br>Count: ${value}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 30) + "px")
              .style("display", "block");
          }
        })
        .on("mouseout", () => tooltip.style("display", "none"));

      drawLegend(svg, keys, color, width - 10, 80);

      svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
      svg.append("g").call(d3.axisLeft(y));
    }
  });
});