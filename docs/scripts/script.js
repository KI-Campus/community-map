var shouldGenerateAsPNG = false;

// This object defines the font color and background color of different categories.
// We can add more categories in this object and the implementation will still work.
var categories = {
  "Partner": { fontColor: '#FFFFFF', backgroundColor: '#2891ba' },
  "Lehr-Fellowship": { fontColor: '#FFFFFF', backgroundColor: '#1AA469' },
  "KI-Campus-Original": { fontColor: '#000000', backgroundColor: '#eaf4f8' }
};

var activeCategories = Object.keys(categories);

var width = null;
var height = null
var scale = 0;
var svg = null
var tooltip = null;
var projection = null;
var path = null;
var g = null;
var parsedData = {};

function updateMap(element) {
  if (element.checked) {
    activeCategories.push(element.name);
  } else {
    activeCategories.splice(activeCategories.indexOf(element.name), 1);
  }

  generateMap(activeCategories);
}

function enableDownloadButton(imgData) {
  document.getElementById('download-btn').onclick = () => {
    var link = document.createElement('a');
    link.download = 'map.png';
    link.href = imgData;
    link.click();
  };
}

function convertMaptoPNG() {
  // Select the SVG element
  var svg = document.querySelector('svg');

  // Get the SVG dimensions and create a canvas element with the same dimensions
  var svgData = new XMLSerializer().serializeToString(svg);
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  var width = parseInt(svg.getAttribute('width'));
  var height = parseInt(svg.getAttribute('height'));

  // Increase the canvas resolution
  var scaleFactor = 3; // Adjust this value as needed
  canvas.width = width * scaleFactor;
  canvas.height = height * scaleFactor;
  canvas.style.width = width + 'px'; // Set the displayed width of the canvas
  canvas.style.height = height + 'px'; // Set the displayed height of the canvas
  ctx.scale(scaleFactor, scaleFactor); // Scale the canvas

  var img = new Image();
  img.onload = function () {
    ctx.drawImage(img, 0, 0, width, height); // Draw the image at original size

    // Get the PNG data from the canvas
    var imgData = canvas.toDataURL('image/png');

    // Update the image element with the PNG data
    var mapImage = document.getElementById('map-image');
    mapImage.src = imgData;
    mapImage.width = width;
    mapImage.height = height;
    mapImage.style.display = 'block';

    enableDownloadButton(imgData);
    svg.style.display = 'none';
  };
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}


function drawMap() {
  width = document.body.getBoundingClientRect().width;
  height = document.body.getBoundingClientRect().height;
  scale = 0;

  if (width < 450) {
    scale = 2100;
  } else if (width < 600) {
    scale = 2400;
  } else if (width < 1000) {
    scale = 3500;
  } else if (width < 1500) {
    scale = 5000;
  } else if (width < 2000) {
    scale = 6000;
  }

  if (height <= 400) {
    scale = 2500;
  } else if (height < 700) {
    scale = 3000;
  } else if (height <= 800) {
    scale = 3500;
  }

  d3.select("body").html(
    `
      ${shouldGenerateAsPNG ? "<button id='download-btn'>Download</button><img src='' alt='map' id='map-image'>" : ""}
      <div class="switches">
        ${Object.keys(categories).map((category) => `
        <div class="switch-container">
            <label class="switch">
              <input
                type="checkbox"
                name="${category}"
                ${activeCategories.includes(category) ? 'checked' : ''}
                onclick="updateMap(this)"
              />
            </label>
            <div class="switch-container" style="background-color: ${categories[category].backgroundColor}">
              <p class="switch-text" style="color: ${categories[category].fontColor}">${category}</p>
            </div>
          </div>
        `).toString().replaceAll(",", "")}
      </div>
    `
  );

  svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

  tooltip = d3.select("body").append("div")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("display", "none")
    .style("background", "#FFFFFF")
    .attr("class", "tooltip")
    .on('mouseleave', function () { return tooltip.style("display", "none"); });

  //changing the projection from mercator to albers
  projection = d3.geo.albers()
    .center([10.42, 50.7])
    .rotate([0, 0])
    .parallels([50, 10])
    .scale(scale)
    .translate([width / 2, height / 2]);

  path = d3.geo.path()
    .projection(projection);

  g = svg.append("g");

  //zoom and pan functionality
  var zoom = d3.behavior.zoom()
    .scaleExtent([1, 6])
    .on("zoom", function () {
      g.attr("transform", "translate(" + d3.event.translate.join(",") + ")scale(" + d3.event.scale + ")");
      g.selectAll("path")
        .attr("d", path.projection(projection));
    });
  svg.call(zoom);
}

function addCityLocations(cities) {
  return new Promise((resolve) => {
    d3.json("./data/4_niedrig.geo.json", function (geojson) {
      g.selectAll("path")
        .data(geojson.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr('stroke', '#FFFFFF')
        .attr('stroke-width', '0.5px')
        .attr('fill', '#3A2A78');

      // add city location circles
      g.selectAll("circle")
        .data(Object.values(cities))
        .enter()
        .append("circle")
        .attr("cx", function (d) { return projection([d.lon, d.lat])[0]; })
        .attr("cy", function (d) { return projection([d.lon, d.lat])[1]; })
        .attr("r", 3.5)
        .style("fill", "rgb(243, 146, 0)")
        .style("opacity", 1.0)
        .on('mouseover', function (d) {
          d3.select(this).style('fill', '#EAF4F8');
          const city = `<div class="city">${d.city}</div>`;
          const institutions = d.institutions.map((institution) => `
            <div
              class="institution"
              onclick="window.location.href = '${institution.url}';"
              style="
                background-color: ${categories[institution.category.trim()].backgroundColor}; color: ${categories[institution.category.trim()].fontColor}
              ">
              ${institution.name}
            </div>
          `).join('');
          tooltip.html(city + institutions);
          tooltip.style("top", (d3.event.pageY - 10) + "px").style("left", (d3.event.pageX - 3) + "px");
          if (d.institutions.length > 10) {
            tooltip.style("height", "35vh");
          } else {
            tooltip.style("height", "auto");
          }
          if (d.institutions.length * 32 + 40 > window.innerHeight - d3.event.pageY) {
            tooltip.style("height", `${window.innerHeight - d3.event.pageY - 50}px`);
          }
          return tooltip.style("display", "block");
        })
        .on('mouseleave', function () { return d3.select(this).style('fill', 'rgb(243, 146, 0)'); });

      resolve();
    });
  })
}

async function loadData(activeCategories) {
  return new Promise((resolve) => {
    parsedData = {};

    d3.csv("./data/partners.csv", function (data) {
      for (var i = 0; i < data.length; i++) {
        if (parsedData[data[i].city] === undefined) {
          parsedData[data[i].city] = {
            city: data[i].city || '',
            lat: data[i].lat || '',
            lon: data[i].lon || ''
          };
        }
        if (parsedData[data[i].city]['institutions'] === undefined) {
          parsedData[data[i].city]['institutions'] = [{
            name: data[i].name || '',
            category: data[i].category || '',
            partnerSince: data[i].partner_since || '',
            url: data[i].url || ''
          }]
        } else {
          parsedData[data[i].city]['institutions'].push({
            name: data[i].name || '',
            category: data[i].category || '',
            partnerSince: data[i].partner_since || '',
            url: data[i].url || ''
          });
        }
      }

      // Filter the data based on active categories
      Object.values(parsedData).forEach((data) => {
        parsedData[data.city].institutions = data.institutions.filter((institution) => activeCategories.includes(institution.category.trim()));
        if (parsedData[data.city].institutions.length === 0) {
          delete parsedData[data.city];
        }
      });

      // sort institutions by category
      for (var city in parsedData) {
        if (parsedData.hasOwnProperty(city)) {
          parsedData[city]['institutions'].sort((a, b) => a.category.localeCompare(b.category));
        }
      }

      parsedData = Object.keys(parsedData).sort().reduce(
        (obj, key) => {
          obj[key] = parsedData[key];
          return obj;
        },
        {}
      );

      resolve();
    });
  });
}

async function generateMap(activeCategories) {
  await loadData(activeCategories);
  drawMap();
  await addCityLocations(parsedData);
  if (shouldGenerateAsPNG) {
    convertMaptoPNG();
  }
}

async function generateTable() {
  await loadData(activeCategories);

  let totalLength = Object.values(parsedData).length * 27;
  console.log(parsedData);
  for (var i = 0; i < Object.values(parsedData).length; i++) {
    totalLength += Object.values(parsedData)[i].institutions.length * 32;
  }

  const table = document.createElement('table');
  let tableRow = document.createElement('tr');
  let column1 = document.createElement('td');
  let column2 = document.createElement('td');
  tableRow.appendChild(column1);
  tableRow.appendChild(column2);
  table.appendChild(tableRow);
  document.body.appendChild(table);

  let currentColumn = column1;
  let currentLength = 0;
  let checkLength = true;

  for (var i = 0; i < Object.keys(parsedData).length; i++) {
    currentLength += 27;
    currentColumn.innerHTML += `
        <p
          style="
            background-color: #fff;
            color: #000;
            font-weight: bold;
            padding: 3px;
            display: inline-block;
            margin: 14px 0px;
          "
        >
          ${Object.values(parsedData)[i].city}
        </p>
    `;
    let institutions = Object.values(parsedData)[i].institutions;
    for (var j = 0; j < institutions.length; j++) {
      currentLength += 32;
      const backgroundColor = categories[institutions[j].category.trim()]?.backgroundColor || '#000000';
      const fontColor = categories[institutions[j].category.trim()]?.fontColor || '#FFFFFF';
      currentColumn.innerHTML += `
        <p
          style="
            background-color: ${backgroundColor};
            color: ${fontColor};
            padding: 3px;
            margin: 5px 8px;
            width: fit-content;
          "
        >
          ${institutions[j].name}
        </p>
      `;
    }
    if (checkLength && currentLength >= totalLength / 2) {
      currentColumn = column2;
      checkLength = false;
    }
  }
}

function generateMapAsSVG() {
  window.addEventListener("resize", function () {
    generateMap(activeCategories);
  });

  shouldGenerateAsPNG = false;
  generateMap(activeCategories);
}

function generateMapAsPNG() {
  window.addEventListener("resize", function () {
    generateMap(activeCategories);
  });

  shouldGenerateAsPNG = true;
  generateMap(activeCategories);
}