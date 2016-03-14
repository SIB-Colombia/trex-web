angular.module('taxonApp.services', []).
factory('tRexAPIService', function($http){
  var tRexAPI = {};
  tRexAPI.searchTaxons = function(taxons){
    return $http({
      url: '/query',
      data: taxons,
      method: 'POST'
    });
  }

  tRexAPI.gnrDatasources = function(){
    return $http({
      url: '/js/dependencies/data_sources.json',
      method: 'GET'
    });
  }

  return tRexAPI;
});
