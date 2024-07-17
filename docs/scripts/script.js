var shouldGenerateAsPNG = false;

// This object defines the font color and background color of different categories
// More categories can be added here if needed
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
var stylesheet = null;
var zoom = null;

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

function getCSSPropertiesForClass(cssInput, className) {
  const regex = new RegExp(`\\.${className}\\s*{([^}]+)}`, 'i');
  const match = cssInput.match(regex);

  if (match && match.length > 1) {
    const propertiesString = match[1].trim();
    const propertiesArray = propertiesString.split(';').map(property => property.trim());
    const properties = {};

    propertiesArray.forEach(property => {
      const [key, value] = property.split(':').map(part => part.trim());
      if (key && value) {
        properties[key] = value;
      }
    });

    return properties;
  }

  return null;
}

async function loadCSS() {
  return new Promise((resolve) => {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'styles/stylesheet.css', true);
  
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        stylesheet = xhr.responseText;
        resolve();
      }
    };
  
    xhr.send();
  });
}

async function convertMaptoPNG() {
    await loadCSS();

    // Select the SVG element
    var svg = document.querySelector('svg');
  
    // Modify the SVG to include the legend elements
    var legendSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  
    // Add the legend
    // Create a foreignObject to hold the switches div and its contents
    var foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    foreignObject.setAttribute('x', '21%'); // x position
    foreignObject.setAttribute('y', '15%'); // y position
    foreignObject.setAttribute('width', '300');
    foreignObject.setAttribute('height', '200');

    // Create a div to hold the switches div
    var div = document.createElement('div');
    div.setAttribute('class', 'switches');

    const switchContainerClass = 'legend-switch-container';
    const switchTextClass = 'legend-switch-text';
  
    for (var category in categories) {
      // switchContainer style
      var switchContainer = document.createElement('div');
      switchContainer.setAttribute('class', switchContainerClass);
      switchContainer.style.backgroundColor = categories[category].backgroundColor;
      switchContainer.style.color = categories[category].fontColor;

      // switchText style
      var switchText = document.createElement('p');
      switchText.setAttribute('class', switchTextClass);
      switchText.style.color = categories[category].fontColor;
      switchText.innerText = category;
      switchText.innerText = category;

      // load properties from CSS file
      const switchContainerProperties = getCSSPropertiesForClass(stylesheet, switchContainerClass);
      const switchTextProperties = getCSSPropertiesForClass(stylesheet, switchTextClass);

      Object.keys(switchContainerProperties).forEach((switchContainerProperty) => {
        switchContainer.style.setProperty(switchContainerProperty, switchContainerProperties[switchContainerProperty]);
      });

      Object.keys(switchTextProperties).forEach((switchTextProperty) => {
        switchText.style.setProperty(switchTextProperty, switchTextProperties[switchTextProperty]);
      });
      
      var label = document.createElement('label');
      label.setAttribute('class', 'switch');
  
      var checkbox = document.createElement('input');
      checkbox.setAttribute('type', 'checkbox');
      checkbox.setAttribute('name', category);
      checkbox.setAttribute('checked', '');
      checkbox.setAttribute('onclick', 'updateMap(this)');
  
      label.appendChild(checkbox);
      switchContainer.appendChild(label);
      switchContainer.appendChild(switchText);
      div.appendChild(switchContainer);
    }
  
    foreignObject.appendChild(div);
    legendSvg.appendChild(foreignObject);
    svg.appendChild(legendSvg);
  



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
    ctx.drawImage(img, 0, 0, width, height); // Draw the image at the original size

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

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints;
}

function drawMap() {
  width = document.body.getBoundingClientRect().width;
  height = document.body.getBoundingClientRect().height;
  scale = 0; // scale of the map, determines the size

  // scale is set according to width of the browser window
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

  // scale is set according to the height of the browser window
  if (height <= 400) {
    scale = 2500;
  } else if (height < 700) {
    scale = 3000;
  } else if (height <= 800) {
    scale = 3500;
  }

  // add checkbox 
  d3.select("body").html(
    ` 
      ${shouldGenerateAsPNG ? "<button id='download-btn'>Download</button><img src='' alt='map' id='map-image'>" : ""}
      ${!shouldGenerateAsPNG ? `
      <div class="switches">
        <span class="zoominSpan">CTRL+Scroll: Zoom In on Maps</span>
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
      ` : ""}
    `
  );

  svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("id", "map-svg")
    .on('click', function () {
      if(!isTouchDevice()){
        tooltip.style("display", "none");
        svg.selectAll('circle').transition().duration(100).attr('r', 3.5);
      }
    })

  tooltip = d3.select("body").append("div")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("display", "none")
    .style("background", "#FFFFFF")
    .attr("class", "tooltip")
    .on('mouseleave', function () { 
      svg.selectAll('circle').transition().duration(100).attr('r', 3.5);
      return tooltip.style("display", "none"); 
    });

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
  zoom = d3.behavior.zoom()
    .scaleExtent([1, 6])
    .on("zoom", function (e) {
      g.attr("transform", "translate(" + d3.event.translate.join(",") + ")scale(" + d3.event.scale + ")");
      g.selectAll("path")
        .attr("d", path.projection(projection));
    });
  // svg.call(zoom);
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
        .attr("stroke", "transparent")
        .attr("stroke-width", 10)
        .style("fill", "rgb(243, 146, 0)")
        .style("opacity", 1.0)
        .on('mouseover', function (d) { // city mouseover tooltips
          svg.selectAll('circle').transition().duration(100).attr('r', 3.5);

          d3.select(this)
            .transition()
            .duration(100)
            .attr('r', 7.5)
            .style('box-shadow', '2px 2px 4px rgb(0, 0, 0,)');
          // d3.select(this).style('fill', '#EAF4F8');
          const city = `<div class="city">${d.city}</div>`;
          const institutions = d.institutions.map((institution) => `
            <div
              class="institution"
              onclick="window.open('${institution.url}', '_blank');"
              style="
                background-color: ${categories[institution.category.trim()].backgroundColor}; color: ${categories[institution.category.trim()].fontColor}
              ">
              ${institution.name}
            </div>
          `).join('');
          tooltip.html(city + institutions);
          if (window.innerWidth - d3.event.pageX < 130){
            tooltip.style("top", (d3.event.pageY + 20) + "px").style("left", (window.innerWidth - 150) + "px");
          } else {
            tooltip.style("top", (d3.event.pageY + 0) + "px").style("left", (d3.event.pageX - 3) + "px");
          }
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
        .on('mouseleave', function () {
          if(isTouchDevice()){
            d3.select(this)
              .transition()
              .duration(100)
              .attr('r', 3.5);
            return tooltip.style("display", "none");
          }
        });

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

      // filter the data based on active categories
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

  // png
  if (shouldGenerateAsPNG) {
    convertMaptoPNG();
  }
}

async function generateTable() {
  await loadData(activeCategories);

  // set lengths of city and institution box in the table
  // necessary for calculation of where the breakpoint in the table is
  // has to be calculated from the base length, from padding, margin top and margin bottom as specified below
  const cityLength = 21 + 0 + 2 + 0; // in pixel
  const institutionLength = 27 + 3 + 5 + 5; // in pixel

  // calculate total length
  let totalLength = Object.values(parsedData).length * cityLength; // in pixel
  for (var i = 0; i < Object.values(parsedData).length; i++) {
    totalLength += Object.values(parsedData)[i].institutions.length * institutionLength;
  }

  // set up empty table
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
  let checkLength = true; // set this to false for displaying only one column

  // loop for cities
  for (var i = 0; i < Object.keys(parsedData).length; i++) {
    currentLength += cityLength;
    currentColumn.innerHTML += `
        <p
          style="
            background-color: #fff;
            color: #000;
            font-weight: bold;
            padding: 0px;
            display: inline-block;
            margin: 2px 0px 0px 0px;
          "
        >
          ${Object.values(parsedData)[i].city}
        </p>
    `;
    let institutions = Object.values(parsedData)[i].institutions;
    
    // loop for institutions
    for (var j = 0; j < institutions.length; j++) {
      currentLength += institutionLength;
      const backgroundColor = categories[institutions[j].category.trim()]?.backgroundColor || '#000000';
      const fontColor = categories[institutions[j].category.trim()]?.fontColor || '#FFFFFF';
      currentColumn.innerHTML += `
        <p
          style="
            background-color: ${backgroundColor};
            color: ${fontColor};
            padding: 3px;
            margin: 5px 5px 5px 5px;
            width: fit-content;
          "
        >
          ${institutions[j].name}
        </p>
      `;
    }

    // condition for checking which column shall be populated
    if (checkLength && currentLength >= totalLength / 2) {
      // if true, switch to second column. if not, populate first column
      currentColumn = column2;
      checkLength = false;
    }
  }
}

function generateMapAsSVG() {
  // timeout to avoid bugs which arise when the window is resized (using the mouse for example)
  window.addEventListener("resize", function () {
    setTimeout(() => {
      generateMap(activeCategories);
    }, 2000);
  });

  // an eventlistener to watch key presses and specially for ctrl key that would be used in maps zooming
  window.addEventListener("keydown", (e) => {
    if(e.key === "Control") { svg.call(zoom); }
  });
  window.addEventListener("keyup", (e) => {
    if(e.key === "Control") { svg.on('.zoom', null); }
  });

  shouldGenerateAsPNG = false;
  generateMap(activeCategories);
}

function generateMapAsPNG() {
  // timeout to avoid bugs which arise when the window is resized (using the mouse for example)
  window.addEventListener("resize", function () {
    setTimeout(() => {
      generateMap(activeCategories);
    }, 2000);
  });

  shouldGenerateAsPNG = true;
  generateMap(activeCategories);
}