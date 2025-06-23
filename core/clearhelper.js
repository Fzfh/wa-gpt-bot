const {
  produkPulsaMap,
  selectedPulsaMap,
  lastPulsaMap,
  produkKoutaMap,
  selectedKoutaMap,
  lastKoutaMap
} = require('./state');

function clearPulsaSession(userId) {
  produkPulsaMap.delete(userId);
  selectedPulsaMap.delete(userId);
  lastPulsaMap.delete(userId);
}

function clearKoutaSession(userId) {
  produkKoutaMap.delete(userId);
  selectedKoutaMap.delete(userId);
  lastKoutaMap.delete(userId);
}

module.exports = {
  clearPulsaSession,
  clearKoutaSession
};
