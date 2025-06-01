function getRegionId(region) {
  return region.JPT_KOD_JE
      || selectedRegion.ADM1_PCODE.substring(3);
}

function getRegionName(region) {
  return region.nazwa || region.JPT_NAZWA_ || region.ADM1_PL;
}

function getSubregionType(regionType) {
  return regionType === 'woj' ? 'powiat' : 'gmina';
}

function getRegionNameForFiltering(region, regionType) {
  let name = getRegionName(region);
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

fetch('contours_data/pol_admbnda_adm1_gov_v02_20220414.json')
  .then(res => res.json())
  .then(data => {
    regionData['woj'] = data;

    function highlightFeature(e) {
      var layer = e.target;
      layer.setStyle({
        fillColor: "#a10028",
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
      selectedRegionType = selectedRegion.RODZAJ || 'woj'
      map.fitBounds(e.target.getBounds());

      // Select in dropdown:
      regionSelector[selectedRegionType].value = getRegionNameForFiltering(selectedRegion, selectedRegionType)
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

      nextLayer = L.geoJson(filteredSubregions, {
        style: {
          color: "#0066cc",
          weight: 1.5,
          fillColor: "#aad3df",
          fillOpacity: 0.6
        },
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

    function onEachFeature(feature, layer) {
      layer.on({
        mouseover: highlightFeature,
        mouseout: (e) => resetHighlight(e, layers['woj']),
        click: zoomToFeature
      });
    }

    layers['woj'] = L.geoJson(data, {
      style: {
        color: "#999",
        weight: 1.5,
        fillColor: "#dddddd",
        fillOpacity: 0.6
      },
      onEachFeature: onEachFeature
    }).addTo(map);
  });