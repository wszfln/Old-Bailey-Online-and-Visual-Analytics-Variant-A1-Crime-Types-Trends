let currentData = [];
let currentMode = "category";
let categoryMap = {};
let selectedKeys = new Set();

const categorySelector = document.getElementById("categorySelector");
const filterDiv = document.getElementById("filterCheckboxes");
const subcategoryDiv = document.getElementById("subcategoryCheckboxes");

categorySelector.addEventListener("change", e => {
  currentMode = e.target.value;
  const file = currentMode === "subcategory"
    ? "/static/data/q1_offence_subcategory.json"
    : "/static/data/q1_offence_category.json";
  d3.json(file).then(data => {
    // Normalize data to relative frequencies
    data.forEach(row => {
      const keys = Object.keys(row).filter(k => k !== "year");
      const total = d3.sum(keys.map(k => row[k]));
      keys.forEach(k => {
        row[k] = total > 0 ? +(row[k] / total).toFixed(3) : 0;
      });
    });
    currentData = data;
    const keys = Object.keys(data[0]).filter(k => k !== "year");
    selectedKeys = new Set();
    renderCheckboxes(keys);
    drawChart();
  });
});

fetch("/static/data/q1_offence_map.json")
  .then(res => res.json())
  .then(map => {
    categoryMap = map;
    categorySelector.dispatchEvent(new Event("change"));
  });

function renderCheckboxes(keys) {
  filterDiv.innerHTML = "<p><strong>Filter:</strong></p>";
  keys.forEach(key => {
    const label = document.createElement("label");
    label.innerHTML = `<input type='checkbox' value='${key}'> ${key}`;
    label.querySelector("input").addEventListener("change", e => {
      if (e.target.checked) {
        selectedKeys.add(key);
      } else {
        selectedKeys.delete(key);
      }
      drawChart();
    });
    filterDiv.appendChild(label);
    filterDiv.appendChild(document.createElement("br"));
  });

  // Only show subcategory mapping if mode is subcategory
  subcategoryDiv.innerHTML = "";
  if (currentMode === "subcategory") {
    subcategoryDiv.innerHTML = "<p><strong>Select all subcategories under the main category:</strong></p>";
    Object.keys(categoryMap).forEach(cat => {
      const label = document.createElement("label");
      label.innerHTML = `<input type='checkbox' value='${cat}'> ${cat}`;
      label.querySelector("input").addEventListener("change", e => {
        const subcats = categoryMap[cat] || [];
        if (e.target.checked) {
          subcats.forEach(sc => selectedKeys.add(sc));
        } else {
          subcats.forEach(sc => selectedKeys.delete(sc));
        }
        drawChart();
        updateCheckboxUI();
      });
      subcategoryDiv.appendChild(label);
      subcategoryDiv.appendChild(document.createElement("br"));
    });
  }
}

function updateCheckboxUI() {
  const inputs = filterDiv.querySelectorAll("input");
  inputs.forEach(input => {
    input.checked = selectedKeys.has(input.value);
  });
}

function drawChart() {
  d3.select(".tooltip")?.remove();
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("padding", "6px")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("opacity", 0);
  d3.select("svg").remove();
  const keys = selectedKeys.size > 0 ? Array.from(selectedKeys) : Object.keys(currentData[0]).filter(k => k !== "year");
  const svg = d3.select("#chart").append("svg").attr("width", 900).attr("height", 500);
  const margin = {top: 40, right: 160, bottom: 30, left: 50},
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom;
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const stackedData = d3.stack().keys(keys)(currentData);
  const x = d3.scaleLinear().domain(d3.extent(currentData, d => d.year)).range([0, width]);
  const y = d3.scaleLinear().domain([0, 1]).range([height, 0]);
  const color = d3.scaleOrdinal().domain(keys).range(d3.schemeTableau10);

  g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
  g.append("g").call(d3.axisLeft(y).tickFormat(d3.format(".0%")));

  const area = d3.area().x(d => x(d.data.year)).y0(d => y(d[0])).y1(d => y(d[1]));
  g.selectAll(".layer")
   .data(stackedData)
   .enter().append("path")
   .attr("class", "layer")
   .attr("d", area)
   .on("mousemove", function(event, d) {
     const [xm, ym] = d3.pointer(event);
     const year = Math.round(x.invert(xm));
     const row = currentData.find(r => r.year === year);
     const freq = row ? row[d.key] : 0;
     tooltip.transition().duration(200).style("opacity", 0.9);
     tooltip.html(`<strong>${d.key}</strong><br>Year: ${year}<br>Frequency: ${(freq * 100).toFixed(1)}%`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
   })
   .on("mouseout", function() {
     tooltip.transition().duration(300).style("opacity", 0);
   })
   .style("fill", d => color(d.key))
   .style("opacity", 0.8);

  const legend = svg.append("g").attr("transform", `translate(${width + margin.left + 10}, ${margin.top})`);
  keys.forEach((key, i) => {
    legend.append("rect").attr("x", 0).attr("y", i * 20).attr("width", 12).attr("height", 12).attr("fill", color(key));
    legend.append("text").attr("x", 20).attr("y", i * 20 + 10).text(key).attr("font-size", "12px");
  });
}