const svg = d3.select("#q9_chart")
    .append("svg")
    .attr("width", 900)
    .attr("height", 500);

const margin = { top: 60, right: 180, bottom: 50, left: 60 },
    width = +svg.attr("width") - margin.left - margin.right,
    height = +svg.attr("height") - margin.top - margin.bottom;

const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const selector = d3.select("#q9_selector");
const modeSelector = d3.select("#q9_mode_selector");

const tooltip = d3.select("#q9_chart")
    .append("div")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("border", "1px solid #ccc")
    .style("padding", "6px")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("opacity", 0);

Promise.all([
    d3.json("/static/data/q9_tech_crimes_and_time.json")
]).then(([json]) => {
    const rawData = json.data;
    const techPeriods = json.tech_periods;

    const allTechnologies = [...new Set(rawData.map(d => d.technology_related_crimes))];
    allTechnologies.sort();

    selector.selectAll("option")
        .data(allTechnologies)
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d);

    let selectedTech = allTechnologies[0];
    let mode = "count";

    selector.on("change", function () {
        selectedTech = this.value;
        updateChart();
    });

    modeSelector.on("change", function () {
        mode = this.value;
        updateChart();
    });

    function updateChart() {
        g.selectAll("*").remove();

        const filtered = rawData.filter(d => d.technology_related_crimes === selectedTech);
        const nested = d3.group(filtered, d => d.year);

        const stackKeys = Array.from(new Set(filtered.map(d => d.offence_subcategory)));

        const stackedDataInput = Array.from(nested, ([year, records]) => {
            const obj = { year: +year };
            records.forEach(d => {
                obj[d.offence_subcategory] = mode === "count" ? d.count : d.proportion;
            });
            return obj;
        });

        const stackedData = d3.stack()
            .keys(stackKeys)
            .value((d, key) => d[key] || 0)(stackedDataInput);

        const years = stackedDataInput.map(d => d.year);

        const x = d3.scaleLinear()
            .domain(d3.extent(years))
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(stackedData, layer => d3.max(layer, d => d[1]))])
            .range([height, 0]);

        const color = d3.scaleOrdinal().domain(stackKeys).range(d3.schemeTableau10);

        const techInfo = techPeriods[selectedTech];

        g.selectAll(".layer")
            .data(stackedData)
            .enter()
            .append("path")
            .attr("class", "layer")
            .attr("fill", d => color(d.key))
            .attr("d", d3.area()
                .x(d => x(d.data.year))
                .y0(d => y(d[0]))
                .y1(d => y(d[1]))
            )
            .on("mousemove", function (event, d) {
                const [xPos, yPos] = d3.pointer(event);
                const year = Math.round(x.invert(xPos));
                const record = d.find(e => e.data.year === year);
                if (record) {
                    const val = mode === "count" ? record.data[d.key] : (record.data[d.key] * 100).toFixed(2) + "%";
                    tooltip.transition().duration(200).style("opacity", 1);
                    tooltip.html(`Year: ${year}<br>Crime: ${d.key}<br>Value: ${val}`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY + 10) + "px");
                }
            })
            .on("mouseout", function () {
                tooltip.transition().duration(200).style("opacity", 0);
            });

        if (techInfo) {
            g.append("rect")
                .attr("x", x(techInfo.highlight_start))
                .attr("width", x(techInfo.highlight_end) - x(techInfo.highlight_start))
                .attr("y", 0)
                .attr("height", height)
                .attr("fill", "lightgrey")
                .attr("opacity", 0.4)
                .style("pointer-events", "none");

            g.append("text")
                .attr("x", x((techInfo.highlight_start + techInfo.highlight_end) / 2))
                .attr("y", 10)
                .attr("text-anchor", "middle")
                .style("font-size", "12px")
                .style("pointer-events", "none")
                .text(techInfo.label);

            techInfo.milestones.forEach((milestone, i) => {
                g.append("line")
                    .attr("x1", x(milestone.year))
                    .attr("x2", x(milestone.year))
                    .attr("y1", 0)
                    .attr("y2", height)
                    .attr("stroke", "#555")
                    .attr("stroke-dasharray", "3 3")
                    .style("pointer-events", "none");
                
                const offset = (i % 2 === 0 ? -15 : -30) - Math.floor(i / 2) * 5;
                g.append("text")
                    .attr("x", x(milestone.year))
                    .attr("y", offset)
                    .attr("text-anchor", "middle")
                    .style("font-size", "11px")
                    .style("fill", "#333")
                    .style("pointer-events", "none")
                    .text(`${milestone.year}: ${milestone.label}`);
            });
        }

        g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")));

        g.append("g").call(d3.axisLeft(y));

        const legend = g.append("g")
            .attr("transform", `translate(${width + 10}, 0)`);

        stackKeys.forEach((key, i) => {
            const row = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
            row.append("rect").attr("width", 12).attr("height", 12).attr("fill", color(key));
            row.append("text").attr("x", 18).attr("y", 10).text(key);
        });
    }

    updateChart();
});