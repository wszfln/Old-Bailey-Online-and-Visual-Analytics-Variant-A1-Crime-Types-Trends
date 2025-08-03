const chartDiv = document.getElementById("q4_chart");
const pieDiv = document.getElementById("subcategory_pie");
const modeSelect = document.getElementById("modeSelector");

modeSelect.addEventListener("change", () => {
  drawQ4Chart();
});

function drawQ4Chart() {
  chartDiv.innerHTML = "";
  pieDiv.innerHTML = "";
  d3.select(".tooltip")?.remove();

  const mode = modeSelect.value;

  if (mode === "category") {
    d3.json("/static/data/q4_conviction_by_offence_category.json").then(data => {
      drawBarChart(data, "offence_category", true);
    });
  } else {
    d3.json("/static/data/q4_conviction_by_offence_subcategory.json").then(data => {
      data.forEach(d => d.name = `${d.offence_category} - ${d.offence_subcategory}`);
      drawBarChart(data, "name", false);
    });
  }
}

drawQ4Chart();

function drawBarChart(data, labelKey, enablePie) {
  data.sort((a, b) => b.conviction_rate - a.conviction_rate);
  const margin = { top: 30, right: 20, bottom: 10, left: 260 },
        width = 920 - margin.left - margin.right,
        height = data.length * 20;

  const svg = d3.select("#q4_chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const y = d3.scaleBand()
    .domain(data.map(d => d[labelKey]))
    .range([0, height])
    .padding(0.1);

  const x = d3.scaleLinear()
    .domain([0, 1])
    .range([0, width]);

  const color = d3.scaleSequential(d3.interpolateBlues).domain([0, 1]);

  svg.append("g").call(d3.axisLeft(y));
  svg.append("g")
     .call(d3.axisTop(x).tickFormat(d3.format(".0%")));

  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "white")
    .style("border", "1px solid #aaa")
    .style("padding", "6px")
    .style("border-radius", "4px")
    .style("opacity", 0)
    .style("pointer-events", "none");

  svg.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", d => y(d[labelKey]))
    .attr("width", d => x(d.conviction_rate))
    .attr("height", y.bandwidth())
    .attr("fill", d => color(d.conviction_rate))
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(100).style("opacity", 1);
      tooltip.html(`${d[labelKey]}<br>conviction rate: ${(d.conviction_rate * 100).toFixed(1)}%`)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => {
      tooltip.transition().duration(300).style("opacity", 0);
    })
    .on("click", (event, d) => {
      if (enablePie) drawPieForCategory(d.offence_category);
    });
}

function drawPieForCategory(categoryName) {
  pieDiv.innerHTML = "";

  d3.json("/static/data/q4_conviction_by_offence_subcategory.json").then(subData => {
    const filtered = subData.filter(d => d.offence_category === categoryName);

    if (filtered.length === 0) {
      pieDiv.append("p").text("No visible subcategory data");
      return;
    }

    filtered.forEach(d => {
        d.guilty = +d.guilty;
        d.guilty_category = +d.guilty_category;
    });

    const width = 400, height = 400, radius = Math.min(width, height) / 2;
    const container = d3.select("#subcategory_pie").append("div")
      .style("display", "flex")
      .style("flex-direction", "row")
      .style("justify-content", "center")
      .style("align-items", "center")
      .style("gap", "40px")
      .style("margin-top", "16px");

    const svg = container.append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const totalGuilty = d3.sum(filtered, d => d.guilty);
    const pie = d3.pie().value(d => d.guilty);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    const color = d3.scaleOrdinal()
      .domain(filtered.map(d => d.offence_subcategory))
      .range(d3.schemeCategory10);

    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "white")
      .style("border", "1px solid #aaa")
      .style("padding", "6px")
      .style("border-radius", "4px")
      .style("opacity", 0);

    svg.selectAll("path")
      .data(pie(filtered))
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", d => color(d.data.offence_subcategory))
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(100).style("opacity", 1);
        tooltip.html(`subcategory: ${d.data.offence_subcategory}<br>accounts for: ${(d.data.guilty / d.data.guilty_category * 100).toFixed(1)}%`)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", () => {
        tooltip.transition().duration(300).style("opacity", 0);
      });

    pieDiv.insertAdjacentHTML("afterbegin", `<h3 style="text-align:center">Percentage of convictions for ${categoryName} subcategory</h3>`);
    
    // Add legend
    const legend = container.append("div").attr("class", "legend");
    filtered.forEach(d => {
      const item = legend.append("div").style("display", "flex").style("align-items", "center").style("margin-bottom", "4px");
      item.append("div").style("width", "12px").style("height", "12px").style("margin-right", "6px").style("background-color", color(d.offence_subcategory));
      item.append("span").text(d.offence_subcategory);
    });
  });
}