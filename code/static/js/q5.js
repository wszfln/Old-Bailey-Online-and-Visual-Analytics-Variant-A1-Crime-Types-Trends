const width = 940, height = 400, margin = { top: 30, right: 150, bottom: 30, left: 60 };

const svg = d3.select("#q5_chart")
  .append("svg")
  .attr("width", width + margin.right)
  .attr("height", height);

const chartArea = svg.append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

const tooltip = d3.select("body")
  .append("div")
  .style("position", "absolute")
  .style("background", "#fff")
  .style("padding", "6px")
  .style("border", "1px solid #ccc")
  .style("display", "none");

let selectedCategories = new Set(["all"]);

d3.json("/static/data/q5_property_crime_trends.json").then(data => {
  const parseYear = d3.format("d");
  const allYears = Object.keys(data.yearly_rates).map(d => Math.floor(+d)).sort((a, b) => a - b);

  const x = d3.scaleLinear().domain(d3.extent(allYears)).range([0, width - margin.left - margin.right]);
  const y = d3.scaleLinear().range([height - margin.top - margin.bottom, 0]);

  const colorScale = d3.scaleOrdinal()
    .domain(["all", "theft", "deception", "damage", "violentTheft"])
    .range(["#000", "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728"]);

  const areaColors = ["#fdd", "#dfd", "#ddf", "#ffd", "#fdf"];

  chartArea.selectAll(".crisis-area")
    .data(data.economic_periods)
    .enter()
    .append("rect")
    .attr("class", "crisis-area")
    .attr("x", d => x(d.start))
    .attr("width", d => x(d.end) - x(d.start))
    .attr("y", 0)
    .attr("height", height - margin.top - margin.bottom)
    .attr("fill", (d, i) => areaColors[i % areaColors.length])
    .attr("opacity", 0.5)
    .style("cursor", "pointer")
    .on("click", (event, d) => showPieCharts(d));

 
    const legend = svg.append("g").attr("transform", `translate(${width - 140}, ${margin.top})`);
    data.economic_periods.forEach((d, i) => {
      const g = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
      g.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", areaColors[i % areaColors.length])
        .attr("opacity", 0.5);
      g.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .text(d.label.length > 25 ? d.label.slice(0, 25) + '...' : d.label);
    });


  const categories = ["theft", "deception", "damage", "violentTheft"];
  const lines = {};
  const all = allYears.map(year => {
    const yearStr = String(year) + ".0";
    const total = data.yearly_rates[yearStr]?.total_all || 1;
    const sum = categories.reduce((acc, c) => acc + (data.yearly_rates[yearStr]?.[c] || 0), 0);
    return { year, value: sum / total };
  });
  lines["all"] = all;

  categories.forEach(cat => {
    lines[cat] = allYears.map(year => {
      const yearStr = String(year) + ".0";
      const total = data.yearly_rates[yearStr]?.total_all || 1;
      const count = data.yearly_rates[yearStr]?.[cat] || 0;
      return { year, value: count / total };
    });
  });

  y.domain([0, d3.max(Object.values(lines).flat(), d => d.value)]);

  const xAxis = d3.axisBottom(x).tickFormat(parseYear);
  const yAxis = d3.axisLeft(y).tickFormat(d => `${(d * 100).toFixed(0)}%`);

  chartArea.append("g")
    .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
    .call(xAxis);

  chartArea.append("g")
    .call(yAxis);

  const drawLines = () => {
    chartArea.selectAll(".line-path").remove();
    chartArea.selectAll(".hover-circle").remove();

    selectedCategories.forEach(cat => {
      const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.value));

      chartArea.append("path")
        .datum(lines[cat])
        .attr("class", "line-path")
        .attr("fill", "none")
        .attr("stroke", colorScale(cat))
        .attr("stroke-width", 2)
        .attr("d", line);

      chartArea.selectAll(`.hover-circle-${cat}`)
        .data(lines[cat])
        .enter()
        .append("circle")
        .attr("class", `hover-circle hover-circle-${cat}`)
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.value))
        .attr("r", 4)
        .attr("fill", colorScale(cat))
        .attr("opacity", 0)
        .on("mouseover", (event, d) => {
          tooltip.html(`Year: ${d.year}<br>${cat}: ${(d.value * 100).toFixed(1)}%`)
            .style("display", "block")
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY + 10 + "px");
        })
        .on("mouseout", () => tooltip.style("display", "none"));
    });
  };

  drawLines();

  document.querySelectorAll(".crime-toggle").forEach(input => {
    input.addEventListener("change", function () {
      if (this.checked) selectedCategories.add(this.value);
      else selectedCategories.delete(this.value);
      drawLines();
    });
  });

  function showPieCharts(period) {
    const key = `${period.start}-${period.end}`;
    const crisisData = data.category_proportions.crisis[key];
    drawPie("#crisis_pie", crisisData, `${key} (${period.label})`);
    d3.select("#non_crisis_pie").html("");
  }

  function drawPie(containerId, data, title) {
    const pieW = 300, pieH = 300, radius = Math.min(pieW, pieH) / 2;
    const container = d3.select(containerId);
    container.html("");

    const wrapper = container.append("div")
      .style("display", "flex")
      .style("flex-direction", "column")
      .style("align-items", "center");

    wrapper.append("div")
      .attr("class", "pie-title")
      .style("text-align", "center")
      .style("font-weight", "bold")
      .style("margin-bottom", "10px")
      .text(title);

    const svg = wrapper.append("svg")
      .attr("width", pieW)
      .attr("height", pieH)
      .append("g")
      .attr("transform", `translate(${pieW / 2}, ${pieH / 2})`);

    const pie = d3.pie().value(d => d[1]);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);
    const dataReady = pie(Object.entries(data || {}));

    svg.selectAll('path')
      .data(dataReady)
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', d => colorScale(d.data[0]))
      .on("mouseover", function (event, d) {
        tooltip.html(`${d.data[0]}: ${(d.data[1] * 100).toFixed(1)}%`)
          .style("display", "block")
          .style("left", event.pageX + 5 + "px")
          .style("top", event.pageY + 5 + "px");
      })
      .on("mouseout", () => tooltip.style("display", "none"));

    const legend = wrapper.append("div")
      .style("display", "flex")
      .style("justify-content", "center")
      .style("flex-wrap", "wrap")
      .style("margin-top", "10px");

    Object.keys(data || {}).forEach(key => {
      const item = legend.append("div")
        .style("margin", "5px")
        .style("display", "flex")
        .style("align-items", "center");
      item.append("div")
        .style("width", "15px")
        .style("height", "15px")
        .style("background-color", colorScale(key))
        .style("margin-right", "5px");
      item.append("span").text(key);
    });
  }
});
