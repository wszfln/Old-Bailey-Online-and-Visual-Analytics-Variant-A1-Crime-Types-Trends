// Load category explanation
d3.json("/static/data/q2_category_info.json").then(info => {
  const container = d3.select("#q2_category_info");
  container.append("strong").text("Violent crimes include: ");
  container.append("span").text(info.violent.categories.join(", ") + " | Miscellaneous Subcategories: " + info.violent.subcategories_miscellaneous.join(", "));
  container.append("br");
  container.append("strong").text("Non-violent crimes include: ");
  container.append("span").text(info.nonViolent.categories.join(", ") + " | Miscellaneous Subcategories: " + info.nonViolent.subcategories_miscellaneous.join(", "));
});

d3.json("/static/data/q2_violent_vs_nonviolent.json").then(function(data){
    const svg = d3.select("#q2_chart")
      .append("svg")
      .attr("width", 960)
      .attr("height", 500);

    const margin = { top: 50, right: 150, bottom: 50, left: 60 },
          width = +svg.attr("width") - margin.left - margin.right,
          height = +svg.attr("height") - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const parseYear = d3.timeParse("%Y");
    data.forEach(d => d.year = parseYear(d.year));

    const keys = ["violent", "non-violent", "unknown"];

    const color = d3.scaleOrdinal()
      .domain(keys)
      .range(["#d62728", "#1f77b4", "#ff7f0e"]);

    const stackedData = d3.stack().keys(keys)(data);

    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.year))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, 1])
      .range([height, 0]);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat(d3.timeFormat("%Y")));

    g.append("g")
      .call(d3.axisLeft(y).tickFormat(d3.format(".0%")));

    const area = d3.area()
      .x(d => x(d.data.year))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]));

    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("padding", "10px")
      .style("background", "rgba(255,255,255,0.9)")
      .style("border", "1px solid #ccc")
      .style("box-shadow", "0px 2px 6px rgba(0,0,0,0.2)")
      .style("border-radius", "4px")
      .style("font", "14px sans-serif")
      .style("pointer-events", "none")
      .style("display", "none");

    g.selectAll(".layer")
      .data(stackedData)
      .enter().append("path")
      .attr("class", "layer")
      .attr("fill", d => color(d.key))
      .attr("d", area)
      .on("mousemove", function(event) {
        const [xPos] = d3.pointer(event);
        const year = x.invert(xPos);
        const closest = data.reduce((a, b) => Math.abs(a.year - year) < Math.abs(b.year - year) ? a : b);
        tooltip.style("display", "block")
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 50) + "px")
          .html(`<strong>${d3.timeFormat("%Y")(closest.year)}</strong><br>` +
                keys.map(k => `<span style="color:${color(k)}">${k}:</span> ${(closest[k] * 100).toFixed(1)}%`).join("<br>"));
      })
      .on("mouseout", () => tooltip.style("display", "none"));

    const legend = svg.append("g")
      .attr("transform", `translate(${width + margin.left + 20},${margin.top})`);

    keys.forEach((key, i) => {
      const row = legend.append("g")
        .attr("transform", `translate(0, ${i * 25})`);

      row.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", color(key));

      row.append("text")
        .attr("x", 24)
        .attr("y", 14)
        .text(key);
    });
});
