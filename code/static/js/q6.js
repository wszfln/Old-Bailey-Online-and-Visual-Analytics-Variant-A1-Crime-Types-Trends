const Margin = { top: 30, right: 20, bottom: 10, left: 160 };
const Width = 920 - Margin.left - Margin.right;

const svg = d3.select("#q6_chart")
  .append("svg")
  .attr("width", Width + Margin.left + Margin.right)
  .append("g")
  .attr("transform", `translate(${Margin.left},${Margin.top})`);

const tooltip = d3.select("body")
  .append("div")
  .attr("class", "chart-tooltip")
  .style("position", "absolute")
  .style("padding", "8px")
  .style("background", "rgba(0,0,0,0.8)")
  .style("color", "white")
  .style("border-radius", "6px")
  .style("font-size", "14px")
  .style("pointer-events", "none")
  .style("display", "none");

function updateQ6Chart() {
  const showOriginal = d3.select("#originalCheckbox").property("checked");
  const showPredicted = d3.select("#predictedCheckbox").property("checked");
  const selectedType = d3.select("#q6CategorySelector").property("value");
  const labelKey = selectedType === "subcategory" ? "offence_subcategory" : "offence_category";

  const files = [];
  if (showOriginal) files.push({ key: "Original", file: `q6_offence_${selectedType}_under18_original.json`, color: "#69b3a2" });
  if (showPredicted) files.push({ key: "Predicted", file: `q6_offence_${selectedType}_under18_predicted.json`, color: "#f28e2b" });

  Promise.all(files.map(f => d3.json(`/static/data/${f.file}`))).then(fileDataList => {
    let combined = [];
    fileDataList.forEach((data, idx) => {
      const label = files[idx].key;
      const color = files[idx].color;
      data.forEach(d => {
        if (d.proportion > 0.0005) {
          combined.push({
            label: d[labelKey],
            proportion: d.proportion,
            source: label,
            color: color
          });
        }
      });
    });

    const labels = Array.from(new Set(combined.map(d => d.label)));
    const barHeight = 20;
    const groupHeight = barHeight * files.length + 10;
    const height = labels.length * groupHeight;

    d3.select("#q6_chart svg").attr("height", height + 60);
    svg.selectAll("*").remove();

    const x = d3.scaleLinear().domain([0, d3.max(combined, d => d.proportion)]).range([0, Width]);
    const y = d3.scaleBand().domain(labels).range([0, height]).paddingInner(0.2);

    svg.append("g").call(d3.axisLeft(y));
    svg.append("g").call(d3.axisTop(x).ticks(5).tickFormat(d => (d * 100).toFixed(0) + "%"));

    svg.selectAll("g.bargroup")
      .data(labels)
      .enter()
      .append("g")
      .attr("class", "bargroup")
      .attr("transform", d => `translate(0,${y(d)})`)
      .selectAll("rect")
      .data(label => combined.filter(d => d.label === label))
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d, i) => i * barHeight)
      .attr("width", d => x(d.proportion))
      .attr("height", barHeight - 2)
      .attr("fill", d => d.color)
      .on("mouseover", (event, d) => {
        tooltip
          .style("display", "block")
          .html(`<strong>${d.label}</strong><br>Proportion (${d.source}): ${(d.proportion * 100).toFixed(2)}%`);
      })
      .on("mousemove", event => {
        tooltip.style("left", event.pageX + 15 + "px").style("top", event.pageY - 30 + "px");
      })
      .on("mouseout", () => tooltip.style("display", "none"));
  });
}

d3.select("#q6CategorySelector").on("change", updateQ6Chart);
d3.select("#originalCheckbox").on("change", updateQ6Chart);
d3.select("#predictedCheckbox").on("change", updateQ6Chart);

updateQ6Chart();