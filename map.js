let currentMode = 'wyniki'; // or 'frekwencja'
document.getElementById('wynikiBtn').onclick = () => setMode('wyniki');
document.getElementById('frekwencjaBtn').onclick = () => setMode('frekwencja');

function setMode(mode) {
  currentMode = mode;
  document.getElementById('wynikiBtn').classList.toggle('selected', mode === 'wyniki');
  document.getElementById('frekwencjaBtn').classList.toggle('selected', mode === 'frekwencja');

  document.getElementById('barplot').style.display = mode === 'wyniki' ? 'block' : 'none';
  document.getElementById('pieplot').style.display = mode === 'wyniki' ? 'block' : 'none';

  colorMapRegions();
}

function colorMapRegions() {
  const subregionType = getSubregionType(selectedRegionType);
  if (!layers[subregionType]) return;

  const {frekwencjiByLayer, minFreq, maxFreq} = getFrekwencja(layers[subregionType].getLayers().map((l) => l.feature));

  layers[subregionType].eachLayer(layer => {
    let region = layer.feature.properties;
    if (currentMode === 'frekwencja') {
      let regionNameForFiltering = getRegionNameForFiltering(region);

      const freq = frekwencjiByLayer[regionNameForFiltering];

      layer.setStyle({ fillColor: getFreqColor(freq, minFreq, maxFreq), fillOpacity: 0.9 });
      layer.bindTooltip(
        `${regionNameForFiltering}<br>Frekwencja: ${(freq*100).toFixed(1)}%`,
        { className: 'custom-tooltip', direction: 'center', permanent: false }
      );
    } else {
      layer.setStyle({
        fillColor: "#dddddd",
        fillOpacity: 0.6
      });
      layer.unbindTooltip();
    }
  });
}

function getRegionId(region) {
  return region.JPT_KOD_JE
      || selectedRegion.ADM1_PCODE.substring(3);
}

function getRegionName(region) {
  return region.nazwa || region.JPT_NAZWA_ || region.ADM1_PL;
}

function getRegionType(region) {
   return region.RODZAJ || 'woj';
}

function getSubregionType(regionType) {
  switch (regionType) {
    case 'woj':
      return 'powiat';
    case 'powiat':
      return 'gmina';
    case 'gmina':
      return 'gmina';
    default:
      return 'woj';
  }
}

function getRegionNameForFiltering(region) {
  let name = getRegionName(region);
  const regionType = getRegionType(region);
  switch (regionType) {
    case 'woj':
      return name.toLowerCase();
    case 'powiat':
      return name.replace(/^powiat /g, "");
    case 'gmina':
      return Array.from(regionSelector[regionType].options)
              .map(opt => opt.value)
              .filter(v => (v.replace(/^((m\.)|(gm\.)) /g, "") === name.replace(/^((m\.)|(gm\.)) /g, "")))
              .pop();
  }
}

var map = L.map('map', {
  center: [52.1, 19.4],
  zoom: 6,
  zoomControl: false,
  attributionControl: false
});

let layers = {
  woj: null,
  powiat: null,
  gmina: null,
}

let regionData = {
  woj: null,
  powiat: null,
  gmina: null,
}

let selectedRegion = null;
let selectedRegionType = null;

fetch('contours_data/WGS84/powiaty.json')
  .then(res => res.json())
  .then(data => {
    regionData['powiat'] = data;
  });

fetch('contours_data/WGS84/gminy.json')
  .then(res => res.json())
  .then(data => {
    regionData['gmina'] = data;
  });

function getFrekwencja(layerFeatures) {
  const frekwencjiByLayer = {}
  let maxFreq = 0.0;
  let minFreq = 1.0;
  layerFeatures.forEach(f => {
    const region = f.properties;
    const regionNameForFiltering = getRegionNameForFiltering(region);

    const {uprawnionych, wydano} = frekwencjaPerRegion[getRegionType(region)][regionNameForFiltering];
    const freq = uprawnionych > 0 ? wydano / uprawnionych : 0;
    frekwencjiByLayer[regionNameForFiltering] = freq;
    maxFreq = Math.max(maxFreq, freq);
    minFreq = Math.min(minFreq, freq);
  })
  return {frekwencjiByLayer, minFreq, maxFreq};
}

fetch('contours_data/pol_admbnda_adm1_gov_v02_20220414.json')
  .then(res => res.json())
  .then(data => {
    regionData['woj'] = data;

    const {frekwencjiByLayer, minFreq, maxFreq} = getFrekwencja(data.features);

    layers['woj'] = L.geoJson(data, {
      style: (f) => ({
        color: "#999",
        weight: 1.5,
        fillColor: layerStylingFunction(f, "#dddddd", frekwencjiByLayer, minFreq, maxFreq),
        fillOpacity: 0.6
      }),
      onEachFeature: onEachFeature
    }).addTo(map);
  });

function highlightFeature(e) {
  var layer = e.target;
  layer.setStyle({
    fillColor: "#000000",
    fillOpacity: 1
  });

  // Get center of the region (bounds center is simple and works well for Poland)
  var center = layer.getBounds().getCenter();

  const props = layer.feature.properties;

  // Add custom tooltip at center
  layer.bindTooltip(
    getRegionName(props),
    {
      permanent: true,
      direction: 'center',
      className: 'custom-tooltip',
      offset: [0,0],
      interactive: false
    }
  ).openTooltip(center);
}

function resetHighlight(e, layer) {
  layer.resetStyle(e.target);
  e.target.unbindTooltip();
}

function zoomToFeature(e) {
  selectedRegion = e.target.feature.properties;
  selectedRegionType = getRegionType(selectedRegion);
  map.fitBounds(e.target.getBounds());

  // Select in dropdown:
  regionSelector[selectedRegionType].value = getRegionNameForFiltering(selectedRegion)
  regionSelector[selectedRegionType].dispatchEvent(new Event('change'));

  if (layers['powiat']) {
    map.removeLayer(layers['powiat']);
  }
  if (layers['gmina']) {
    map.removeLayer(layers['gmina']);
  }

  const subregionType = getSubregionType(selectedRegionType)
  const selectedRegionId = getRegionId(selectedRegion)
  const filteredSubregions = {
    ...regionData[subregionType],
    features: regionData[subregionType].features.filter(f =>
      (f.properties.JPT_KOD_JE.startsWith(selectedRegionId))
    )
  };


  const {frekwencjiByLayer, minFreq, maxFreq} = getFrekwencja(filteredSubregions.features);

  nextLayer = L.geoJson(filteredSubregions, {
    style: (f) => ({
      color: "#0066cc",
      weight: 1.5,
      fillColor: layerStylingFunction(f, "#aad3df", frekwencjiByLayer, minFreq, maxFreq),
      fillOpacity: 0.6
    }),
    onEachFeature: function(feature, layer) {
      layer.on({
        mouseover: highlightFeature,
        mouseout: (e) => resetHighlight(e, nextLayer),
        click: zoomToFeature
      });
    }
  }).addTo(map);

  layers[subregionType] = nextLayer;
}

function layerStylingFunction(feature, baseColor, frekwencjiByLayer, minFreq, maxFreq) {
  if (currentMode === 'frekwencja' && getRegionType(feature.properties) === getSubregionType(selectedRegionType)) {
    return getFreqColor(frekwencjiByLayer[getRegionNameForFiltering(feature.properties)], minFreq, maxFreq);
  }
  return baseColor;
}

function onEachFeature(feature, layer) {
  layer.on({
    mouseover: highlightFeature,
    mouseout: (e) => resetHighlight(e, layers['woj']),
    click: zoomToFeature
  });
}