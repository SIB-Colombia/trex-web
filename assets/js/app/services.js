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
  return tRexAPI;
});
