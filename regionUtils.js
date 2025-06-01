
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

function getColumnName(regionType) {
  switch (regionType) {
    case 'powiat':
      return 'Powiat';
    case 'gmina':
      return 'Gmina';
    case 'woj':
    //fallthrought
    default:
      return 'Województwo';
  }
}