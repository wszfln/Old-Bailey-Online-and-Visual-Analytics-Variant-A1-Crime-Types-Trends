const margin = { top: 50, right: 250, bottom: 50, left: 60 };
const width = 1000 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3.select("#q10_chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

let selectedCategory = "all";
let showSubcategories = false;

const color = d3.scaleOrdinal(d3.schemeCategory10);
const policyColors = d3.schemePastel2;

const x = d3.scaleLinear().range([0, width]);
const y = d3.scaleLinear().range([height, 0]);

const area = d3.area()
  .x(d => x(+d.year))
  .y0(d => y(d.y0))
  .y1(d => y(d.y1));

const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("background", "white")
  .style("padding", "6px")
  .style("border", "1px solid #ccc")
  .style("display", "none");

function update(data) {
  svg.selectAll("*").remove();

  const years = Object.keys(data.total).map(d => +d).filter(d => d >= 1720);
  const yearExtent = [1720, d3.max(years)];
  x.domain(yearExtent);

  const policies = data.policy_periods;
  policies.forEach((d, i) => {
    svg.append("rect")
      .attr("x", x(d.start))
      .attr("y", 0)
      .attr("width", x(d.end) - x(d.start))
      .attr("height", height)
      .attr("fill", policyColors[i % policyColors.length])
      .attr("opacity", 0.3);

    d.markers.forEach(marker => {
      svg.append("line")
        .attr("x1", x(marker.year))
        .attr("x2", x(marker.year))
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "gray")
        .attr("stroke-dasharray", "4 2")
        .attr("stroke-width", 1)
        .on("mouseover", function (event) {
          tooltip.style("display", "block")
            .html(`Year: ${marker.year}<br>Policy: ${marker.label}`);
        })
        .on("mousemove", function (event) {
          tooltip.style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function () {
          tooltip.style("display", "none");
        });
    });
  });

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  if (!showSubcategories) {
    let lineData;
    if (selectedCategory === "all") {
      lineData = years.map(year => ({
        year: +year,
        value: data.total[year] ? data.total[year].proportion : 0
      }));
    } else {
      const catData = data.categories[selectedCategory];
      if (!catData) return;
      lineData = Object.keys(catData).map(year => ({
        year: +year,
        value: catData[year].proportion
      })).filter(d => d.year >= 1720);
    }

    y.domain([0, d3.max(lineData, d => d.value)]);

    svg.append("g")
      .call(d3.axisLeft(y).ticks(10).tickFormat(d3.format(".1%")));

    const line = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.value));

    svg.append("path")
      .datum(lineData)
      .attr("fill", "none")
      .attr("stroke", color(selectedCategory))
      .attr("stroke-width", 2)
      .attr("d", line);

    svg.selectAll("circle")
      .data(lineData)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.value))
      .attr("r", 3)
      .attr("fill", color(selectedCategory))
      .on("mouseover", function (event, d) {
        tooltip.style("display", "block")
          .html(`Year: ${d.year}<br>Proportion: ${(d.value * 100).toFixed(2)}%`);
      })
      .on("mousemove", function (event) {
        tooltip.style("left", (event.pageX + 10) + "px")
               .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseout", function () {
        tooltip.style("display", "none");
      });

    const legend = svg.append("g")
      .attr("transform", `translate(${width + 20}, 0)`);

    legend.append("text")
      .attr("y", 0)
      .text("Alcohol Policy Periods")
      .style("font-weight", "bold")
      .style("font-size", "13px");

    let offset = 1;
    policies.forEach((d, i) => {
      const row = legend.append("g").attr("transform", `translate(0, ${offset * 20})`);
      row.append("rect").attr("width", 12).attr("height", 12).attr("fill", policyColors[i % policyColors.length]).attr("opacity", 0.3);
      row.append("text").attr("x", 16).attr("y", 10).text(`${d.label}`).style("font-size", "13px");;
      offset++;
    });

    legend.append("text")
      .attr("y", offset * 25)
      .text(`Category: ${selectedCategory}`);
  } else {
    let stacked = [], domainKeys, stackedData = [];

    if (selectedCategory === "all") {
      const compMap = {};
      years.forEach(year => {
        compMap[year] = data.total[year]?.composition || {};
      });
      domainKeys = Array.from(new Set(years.flatMap(y => Object.keys(compMap[y]))));
      years.forEach(year => {
        const row = { year };
        domainKeys.forEach(key => {
          const proportion = (compMap[year][key] || 0) * (data.total[year]?.proportion || 0);
          row[key] = proportion;
        });
        stackedData.push(row);
      });
    } else {
      const catData = data.categories[selectedCategory];
      if (!catData) return;
      const subYears = Object.keys(catData).map(y => +y).filter(y => y >= 1720);
      domainKeys = Array.from(new Set(subYears.flatMap(y => Object.keys(catData[y]?.composition || {}))));
      subYears.forEach(year => {
        const row = { year };
        domainKeys.forEach(key => {
          const proportion = (catData[year]?.composition[key] || 0) * (catData[year]?.proportion || 0);
          row[key] = proportion;
        });
        stackedData.push(row);
      });
    }

    y.domain([0, d3.max(stackedData, d => domainKeys.reduce((sum, key) => sum + d[key], 0))]);

    svg.append("g").call(d3.axisLeft(y).ticks(10).tickFormat(d3.format(".1%")));

    stacked = d3.stack().keys(domainKeys)(stackedData);

    svg.selectAll(".area")
      .data(stacked)
      .enter()
      .append("path")
      .attr("class", "area")
      .attr("d", d => area(d.map(v => ({
        year: +v.data.year,
        y0: v[0],
        y1: v[1],
        value: (v[1] - v[0]),
        label: d.key
      }))))
      .attr("fill", d => color(d.key))
      .attr("opacity", 0.85)
      .on("mousemove", function (event, d) {
        const [xPos] = d3.pointer(event);
        const year = Math.round(x.invert(xPos));
        const row = stackedData.find(r => +r.year === year);
        if (row && row[d.key] !== undefined) {
          tooltip.style("display", "block")
            .html(`Year: ${year}<br>Category: ${d.key}<br>Proportion: ${(row[d.key] * 100).toFixed(2)}%`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 20) + "px");
        }
      })
      .on("mouseout", function () {
        tooltip.style("display", "none");
      });

    const legend = svg.append("g")
      .attr("transform", `translate(${width + 20}, 0)`);

    legend.append("text")
      .attr("y", 0)
      .text("Alcohol Policy Periods")
      .style("font-weight", "bold")
      .style("font-size", "13px");

    let offset = 1;
    policies.forEach((d, i) => {
      const row = legend.append("g").attr("transform", `translate(0, ${offset * 20})`);
      row.append("rect").attr("width", 12).attr("height", 12).attr("fill", policyColors[i % policyColors.length]).attr("opacity", 0.3);
      row.append("text").attr("x", 16).attr("y", 10).text(`${d.label}`).style("font-size", "13px");
      offset++;
    });

    domainKeys.forEach((key, i) => {
      const row = legend.append("g").attr("transform", `translate(0, ${(offset + i) * 20})`);
      row.append("rect").attr("width", 12).attr("height", 12).attr("fill", color(key));
      row.append("text").attr("x", 16).attr("y", 10).text(key);
    });
  }
}

d3.json("/static/data/q10_alcohol_crime_trends.json").then(data => {
  function render() {
    selectedCategory = document.getElementById("q10Selector").value;
    showSubcategories = document.getElementById("subcategoryToggle").checked;
    update(data);
  }

  document.getElementById("q10Selector").addEventListener("change", render);
  document.getElementById("subcategoryToggle").addEventListener("change", render);

  render();
});