let barChart = null;
let pieChart = null;

const regionSelector = {
  woj: document.getElementById('wojewodztwoSelect'),
  powiat: document.getElementById('powiatSelect'),
  gmina: document.getElementById('gminaSelect'),
};

const isTura2 = window.location.pathname.includes('index2.html');
let data_location = isTura2
    ? 'raw_data/tura_2/wyniki_gl_na_kandydatow_po_gminach_w_drugiej_turze_utf8.csv'
    : 'raw_data/tura_1/wyniki_gl_na_kandydatow_po_gminach_utf8.csv';

Papa.parse(data_location, {
  download: true,
  header: true,
  delimiter: ';',
  complete: function(results) {
    wyniki = results.data.filter(row => row.Województwo); // REMOVE EMPTY LINES

    fillWojewodztwa();
    regionSelector['woj'].addEventListener('change', onWojChange);
    regionSelector['powiat'].addEventListener('change', onPowiatChange);
    regionSelector['gmina'].addEventListener('change', plotCurrent);

    plotCurrent();

    frekwencjaPerRegion = {
      woj: getFrekwencjaSum("Województwo"),
      powiat: getFrekwencjaSum("Powiat"),
      gmina: getFrekwencjaSum("Gmina"),
    }
  }
});

function fillWojewodztwa() {
  const wojSet = new Set(wyniki.map(r=>r.Województwo));
  regionSelector['woj'].innerHTML = `<option value="">Cała Polska</option>` +
    Array.from(wojSet).sort().map(w => `<option value="${w}">${w}</option>`).join('');
  regionSelector['powiat'].innerHTML = `<option value="">Wszystkie powiaty</option>`;
  regionSelector['gmina'].innerHTML = `<option value="">Wszystkie gminy</option>`;
}

function onWojChange() {
  const woj = regionSelector['woj'].value;
  const powiatSet = new Set(
    wyniki.filter(r => !woj || r.Województwo === woj)
          .map(r => r.Powiat).filter(Boolean)
  );
  regionSelector['powiat'].innerHTML = `<option value="">Wszystkie powiaty</option>` +
    Array.from(powiatSet).sort().map(p => `<option value="${p}">${p}</option>`).join('');
  //clear gminy
  regionSelector['gmina'].innerHTML = `<option value="">Wszystkie gminy</option>`;
  plotCurrent();
}
function onPowiatChange() {
  const woj = regionSelector['woj'].value;
  const powiat = regionSelector['powiat'].value;
  const gminaSet = new Set(
    wyniki.filter(r =>
      (!woj || r.Województwo === woj) &&
      (!powiat || r.Powiat === powiat)
    ).map(r => r.Gmina).filter(Boolean)
  );
  regionSelector['gmina'].innerHTML = `<option value="">Wszystkie gminy</option>` +
    Array.from(gminaSet).sort().map(g => `<option value="${g}">${g}</option>`).join('');
  plotCurrent();
}

function plotCurrent(region) {
  const woj = regionSelector['woj'].value;
  const powiat = regionSelector['powiat'].value;
  const gmina = regionSelector['gmina'].value;
  let rows = wyniki.filter(r =>
    (!woj || r.Województwo === woj) &&
    (!powiat || r.Powiat === powiat) &&
    (!gmina || r.Gmina === gmina)
  );
  let votes = candidates.map(cand =>
    rows.reduce((acc, r) => acc + (parseInt((r[cand] || '0').replace(/\s/g,'')) || 0), 0)
  );

  let candWithVotes = candidates.map((cand, idx) => ({
    name: cand,
    value: votes[idx]
  }));
  candWithVotes.sort((a, b) => b.value - a.value);
  const sortedCandidates = candWithVotes.map(obj => obj.name);
  const sortedVotes = candWithVotes.map(obj => obj.value);

  const totalVotes = sortedVotes.reduce((a, b) => a + b, 0);
  console.log(region);

  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById('barplot'), {
    type: 'bar',
    data: {
      labels: sortedCandidates,
      datasets: [{
        data: sortedVotes,
        backgroundColor: [
          '#ff7f0e', '#1f77b4', '#2ca02c','#d62728','#9467bd','#8c564b','#e377c2',
          '#7f7f7f','#bcbd22','#17becf','#a10028','#fcb900','#2176ae'
        ]
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: {
        legend: {display: false},
        title: {display: true, text: `Wykres słupkowy - wyniki`},
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const val = ctx.parsed.x;
              const pct = totalVotes ? (val / totalVotes * 100).toFixed(1) : 0;
              return `${val.toLocaleString('pl-PL')} (${pct}%)`;
            }
          }
        }
      }
    }
  });

  if (pieChart) pieChart.destroy();
  pieChart = new Chart(document.getElementById('pieplot'), {
    type: 'pie',
    data: {
      labels: sortedCandidates,
      datasets: [{
        data: sortedVotes,
        backgroundColor: [
          '#ff7f0e', '#1f77b4', '#2ca02c','#d62728','#9467bd','#8c564b','#e377c2',
          '#7f7f7f','#bcbd22','#17becf','#a10028','#fcb900','#2176ae'
        ]
      }]
    },
    options: {
      plugins: {
        legend: {position: 'right'},
        title: {display: true, text: `Wykres kołowy - wyniki`},
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const val = ctx.parsed;
              const pct = totalVotes ? (val / totalVotes * 100).toFixed(1) : 0;
              return `${val.toLocaleString('pl-PL')} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}