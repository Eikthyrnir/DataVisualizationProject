function getFrekwencjaSum(regionType) {
    const grouped = d3.group(wyniki, d => d[regionType]);
    const sums = {};
    for (const [regionName, rows] of grouped) {
        sums[regionName] = {
            uprawnionych: d3.sum(rows, r => +parseInt(r['Liczba wyborców uprawnionych do głosowania'].replace(/\s/g, ''))),
            wydano: d3.sum(rows, r => +parseInt(r['Liczba wyborców, którym wydano karty do głosowania w lokalu wyborczym'].replace(/\s/g, ''))),
        }
    }
    return sums;
}
