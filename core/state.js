// State Global (pastikan shared antar modul)
global.produkPulsaMap = global.produkPulsaMap || new Map()
global.selectedPulsaMap = global.selectedPulsaMap || new Map()
global.lastPulsaMap = global.lastPulsaMap || new Map()

global.produkKoutaMap = global.produkKoutaMap || new Map()
global.selectedKoutaMap = global.selectedKoutaMap || new Map()
global.lastKoutaMap = global.lastKoutaMap || new Map()

module.exports = {
  produkPulsaMap: global.produkPulsaMap,
  selectedPulsaMap: global.selectedPulsaMap,
  lastPulsaMap: global.lastPulsaMap,
  produkKoutaMap: global.produkKoutaMap,
  selectedKoutaMap: global.selectedKoutaMap,
  lastKoutaMap: global.lastKoutaMap
}
