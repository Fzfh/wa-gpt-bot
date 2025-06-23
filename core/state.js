global.produkPulsaMap = global.produkPulsaMap || new Map()
global.selectedPulsaMap = global.selectedPulsaMap || new Map()
global.lastPulsaMap = global.lastPulsaMap || new Map()

const produkKoutaMap = new Map()
const selectedKoutaMap = new Map()
const lastKoutaMap = new Map()

module.exports = {
  produkPulsaMap: global.produkPulsaMap,
  selectedPulsaMap: global.selectedPulsaMap,
  lastPulsaMap: global.lastPulsaMap,
  produkKoutaMap,
  selectedKoutaMap,
  lastKoutaMap
}
