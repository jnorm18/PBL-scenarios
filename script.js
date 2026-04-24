const DATA_PATH = "data/capacity_projection_data.csv";

let rawRows = [];
let capacityRows = [];
let yearCols = [];
let allRegions = [];
let allScenarios = [];
let selectedScenarios = new Set();

const scenarioPalette = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf"
];

const scenarioColor = {};

function isYearColumn(col) {
  return /^\d{4}$/.test(String(col));
}

function cleanNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(num) ? num : null;
}

function technologyFromVariable(variable) {
  return variable.replace("Capacity|Electricity|", "");
}

function makeScenarioColors() {
  allScenarios.forEach((scenario, i) => {
    scenarioColor[scenario] = scenarioPalette[i % scenarioPalette.length];
  });
}

function initControls() {
  const regionSelect = document.getElementById("regionSelect");
  regionSelect.innerHTML = "";

  allRegions.forEach(region => {
    const option = document.createElement("option");
    option.value = region;
    option.textContent = region;
    if (region.toLowerCase() === "world") option.selected = true;
    regionSelect.appendChild(option);
  });

  regionSelect.addEventListener("change", renderCharts);

  const scenarioControls = document.getElementById("scenarioControls");
  scenarioControls.innerHTML = "";

  allScenarios.forEach(scenario => {
    selectedScenarios.add(scenario);

    const label = document.createElement("label");
    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.value = scenario;
    checkbox.checked = true;

    checkbox.addEventListener("change", event => {
      if (event.target.checked) {
        selectedScenarios.add(scenario);
      } else {
        selectedScenarios.delete(scenario);
      }
      renderCharts();
    });

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(scenario));
    scenarioControls.appendChild(label);
  });
}

function buildTrace(row) {
  const x = [];
  const y = [];

  yearCols.forEach(year => {
    const value = cleanNumber(row[year]);
    if (value !== null) {
      x.push(Number(year));
      y.push(value);
    }
  });

  return {
    x,
    y,
    mode: "lines",
    name: `${row.Model} | ${row.Scenario}`,
    legendgroup: row.Scenario,
    line: {
      color: scenarioColor[row.Scenario],
      width: 1.7
    },
    opacity: 0.45,
    hovertemplate:
      `<b>${row.Model} | ${row.Scenario}</b><br>` +
      "Year: %{x}<br>" +
      "Capacity: %{y:,.1f} GW<extra></extra>"
  };
}

function renderCharts() {
  const selectedRegion = document.getElementById("regionSelect").value;
  const chartGrid = document.getElementById("chartGrid");
  chartGrid.innerHTML = "";

  const regionRows = capacityRows.filter(row =>
    row.Region === selectedRegion &&
    selectedScenarios.has(row.Scenario)
  );

  const technologies = [...new Set(regionRows.map(row =>
    technologyFromVariable(row.Variable)
  ))].sort();

  technologies.forEach(tech => {
    const techRows = regionRows.filter(row =>
      technologyFromVariable(row.Variable) === tech
    );

    const traces = techRows
      .map(buildTrace)
      .filter(trace => trace.x.length > 0);

    const card = document.createElement("div");
    card.className = "chart-card";

    const chartDiv = document.createElement("div");
    chartDiv.className = "chart";

    card.appendChild(chartDiv);
    chartGrid.appendChild(card);

    const layout = {
      title: {
        text: `${tech} capacity projections, ${selectedRegion} (n=${traces.length})`,
        font: { size: 15 }
      },
      xaxis: {
        title: "Year",
        tickvals: yearCols.map(Number),
        tickangle: -45
      },
      yaxis: {
        title: "Capacity (GW)",
        rangemode: "tozero",
        ticksuffix: " GW"
      },
      margin: { l: 65, r: 20, t: 55, b: 65 },
      height: 360,
      hovermode: "closest",
      showlegend: false
    };

    const config = {
      responsive: true,
      displayModeBar: false
    };

    Plotly.newPlot(chartDiv, traces, layout, config);
  });
}

Papa.parse(DATA_PATH, {
  download: true,
  header: true,
  dynamicTyping: false,
  skipEmptyLines: true,
  complete: function(results) {
    rawRows = results.data;

    yearCols = results.meta.fields
      .filter(isYearColumn)
      .sort((a, b) => Number(a) - Number(b));

    capacityRows = rawRows.filter(row =>
      row.Variable &&
      row.Variable.includes("Capacity|Electricity")
    );

    allRegions = [...new Set(capacityRows.map(row => row.Region))]
      .filter(Boolean)
      .sort();

    allScenarios = [...new Set(capacityRows.map(row => row.Scenario))]
      .filter(Boolean)
      .sort();

    makeScenarioColors();
    initControls();
    renderCharts();
  },
  error: function(error) {
    console.error("Error loading CSV:", error);
    document.getElementById("chartGrid").innerHTML =
      `<p>Could not load data file: ${DATA_PATH}</p>`;
  }
});
