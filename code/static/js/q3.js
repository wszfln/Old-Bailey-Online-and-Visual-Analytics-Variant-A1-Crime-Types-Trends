const margin = { top: 70, right: 30, bottom: 50, left: 60 },
      width = 900 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

const svg = d3.select("#q3_chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const missingRatesSVG = d3.select("#missingRates")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", 250)
  .append("g")
  .attr("transform", `translate(${margin.left},${50})`);

const tooltip = d3.select("body")
  .append("div")
  .attr("class", "chart-tooltip")
  .style("position", "absolute")
  .style("padding", "8px")
  .style("background", "rgba(0,0,0,0.8)")
  .style("color", "white")
  .style("border-radius", "6px")
  .style("box-shadow", "0px 2px 6px rgba(0,0,0,0.5)")
  .style("font-size", "14px")
  .style("max-width", "220px")
  .style("pointer-events", "none")
  .style("display", "none");

let allDataOriginal = [], allDataPredicted = [];
let missingRatesOriginal = [];
let categoryList = [];

const categorySelector = d3.select("#categoryDropdown")
  .append("select")
  .attr("id", "categorySelect")
  .on("change", updateChart);

categorySelector.append("option").attr("value", "All").text("All");

Promise.all([
  d3.json("/static/data/q3_capital_crimes.json"),
  d3.json("/static/data/q3_capital_crimes_predicted.json"),
  d3.json("/static/data/q3_missing_rates_original.json")
]).then(([originalData, predictedData, missingData]) => {
  allDataOriginal = originalData;
  allDataPredicted = predictedData;
  missingRatesOriginal = missingData;

  categoryList = Array.from(new Set(originalData.map(d => d.category).filter(d => d !== "All"))).sort();
  categoryList.forEach(cat => {
    categorySelector.append("option").attr("value", cat).text(cat);
  });

  updateChart();

  d3.select("#originalCheckbox").on("change", updateChart);
  d3.select("#predictedCheckbox").on("change", updateChart);
});

function drawMissingRatesChart(selectedCategory) {
  const filtered = selectedCategory === "All"
    ? missingRatesOriginal
    : missingRatesOriginal.filter(d => d.category === selectedCategory);

  const x = d3.scaleBand()
    .domain(filtered.map(d => d.year))
    .range([0, width])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(filtered, d => d.missing_rate * 100) || 1])
    .nice()
    .range([150, 0]);

  missingRatesSVG.append("g")
    .attr("transform", `translate(0,150)`)
    .call(d3.axisBottom(x).tickValues(x.domain().filter((d, i) => !(i % 10))));

  missingRatesSVG.append("g")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + "%"));

  missingRatesSVG.selectAll(`rect.missing`)
    .data(filtered)
    .enter()
    .append("rect")
    .attr("class", "missing")
    .attr("x", d => x(d.year))
    .attr("y", d => y(d.missing_rate * 100))
    .attr("width", x.bandwidth())
    .attr("height", d => 150 - y(d.missing_rate * 100))
    .attr("fill", "steelblue")
    .on("mouseover", (event, d) => {
      tooltip.style("display", "block").html(
        `Year: ${d.year}<br>Missing Rate: ${(d.missing_rate * 100).toFixed(1)}%<br>Missing Cases: ${d.missing}<br>Total Cases: ${d.total}`
      );
    })
    .on("mousemove", event => {
      tooltip.style("left", event.pageX + 15 + "px").style("top", event.pageY - 30 + "px");
    })
    .on("mouseout", () => tooltip.style("display", "none"));
}

function updateChart() {
  const selectedCategory = d3.select("#categorySelect").property("value");
  const showOriginal = d3.select("#originalCheckbox").property("checked");
  const showPredicted = d3.select("#predictedCheckbox").property("checked");

  svg.selectAll("*").remove();
  missingRatesSVG.selectAll("*").remove();

  drawMissingRatesChart(selectedCategory);

  svg.append("circle").attr("cx", width - 150).attr("cy", -40).attr("r", 6).style("fill", "red");
  svg.append("text").attr("x", width - 135).attr("y", -36).text("Annual cases < 10").style("font-size", "12px").attr("alignment-baseline","middle").style("fill","#333");

  const datasets = [];
  if (showOriginal) datasets.push({ key: "Original", data: allDataOriginal });
  if (showPredicted) datasets.push({ key: "Predicted", data: allDataPredicted });

  datasets.forEach((dataset, idx) => {
    let data = dataset.data.filter(d => selectedCategory === "All" || d.category === selectedCategory);
    const years = Array.from(new Set(data.map(d => d.year)));
    const x = d3.scaleLinear().domain(d3.extent(years)).range([0, width]);
    const y = d3.scaleLinear().domain([0, 1]).range([height, 0]);

    const xAxis = d3.axisBottom(x).ticks(10).tickFormat(d3.format("d"));
    const yAxis = d3.axisLeft(y).tickFormat(d3.format(".0%"));
    if (idx === 0) {
      svg.append("g").attr("transform", `translate(0,${height})`).call(xAxis);
      svg.append("g").call(yAxis);
    }

    const line = d3.line()
      .x(d => x(+d.year))
      .y(d => y(+d.capital_rate || 0));

    const grouped = d3.groups(data, d => d.year).map(d => ({ year: d[0], values: d[1] }));

    svg.append("path")
      .datum(grouped.map(g => ({ year: g.year, capital_rate: g.values[0]?.capital_rate || 0 })))
      .attr("fill", "none")
      .attr("stroke", idx === 0 ? "steelblue" : "orange")
      .attr("stroke-width", 2)
      .attr("d", line);

    svg.selectAll(`circle.${dataset.key}`)
      .data(grouped)
      .enter()
      .append("circle")
      .attr("class", dataset.key)
      .attr("cx", d => x(+d.year))
      .attr("cy", d => y(+d.values[0]?.capital_rate || 0))
      .attr("r", 4)
      .attr("fill", d => {
        const totalCases = d.values[0]?.total || 0;
        return totalCases < 10 ? "red" : (idx === 0 ? "steelblue" : "orange");
      })
      .on("mouseover", (event, d) => {
        const totalCases = d.values[0]?.total || 0;
        let info = d.values[0]?.tooltip_info
          ? d.values[0].tooltip_info.replace(/\|/g, '<br>')
          : `Year: ${d.year}`;
        if (totalCases < 10) {
          info += `<br><strong>Total cases: ${totalCases}</strong>`;
          info += `<br><span style="color:#ffb347">Warning: Low case count, proportions may be distorted</span>`;
        }
        tooltip.style("display", "block").html(info);
      })
      .on("mousemove", event => {
        tooltip.style("left", event.pageX + 15 + "px").style("top", event.pageY - 30 + "px");
      })
      .on("mouseout", () => tooltip.style("display", "none"));
  });
}