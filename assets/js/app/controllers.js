angular.module('taxonApp.controllers', []).
controller('taxonController', function($scope, tRexAPIService){
  $scope.queryType = "bioRecords";
  $scope.taxonFilter = null;
  $scope.taxonsList  = [];
  $scope.lang = navigator.language || navigator.userLanguage;

  $scope.on_search = function (sender){
    $scope.lang = navigator.language || navigator.userLanguage;
    switch (sender) {
      case 'btnSearch':
      case 'txtTerms':
       if ($scope.txtTerms.length >= 3){
         txtTerms_search(sender);
       } else {
         //TODO: display no results
       }
        break;
      default:
        break;
    }
  }

  $scope.on_btnDownload_click = function () {
    var ws_name = "results";
    var wb = new Workbook();

    wb.SheetNames.push(ws_name);

    var ws = _sheet_from_array_of_arrays(_generateTable());

    wb.Sheets[ws_name] = ws;

    var wbout = XLSX.write(wb, {bookType:"xlsx", bookSST:true, type:'binary'});

    saveAs(new Blob([_s2ab(wbout)], {type:"application/octect-stream"}), "results.xlsx");
  }

  function _s2ab(s) {
  	var buf = new ArrayBuffer(s.length);
  	var view = new Uint8Array(buf);
  	for (var i=0; i!=s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
  	return buf;
  }

  function _sheet_from_array_of_arrays(data, opts) {
  	var ws = {};
  	var range = {s: {c:10000000, r:10000000}, e: {c:0, r:0 }};
  	for(var R = 0; R != data.length; ++R) {
  		for(var C = 0; C != data[R].length; ++C) {
  			if(range.s.r > R) range.s.r = R;
  			if(range.s.c > C) range.s.c = C;
  			if(range.e.r < R) range.e.r = R;
  			if(range.e.c < C) range.e.c = C;
  			var cell = {v: data[R][C] };
  			if(cell.v == null) continue;
  			var cell_ref = XLSX.utils.encode_cell({c:C,r:R});

  			if(typeof cell.v === 'number') cell.t = 'n';
  			else if(typeof cell.v === 'boolean') cell.t = 'b';
  			else if(cell.v instanceof Date) {
  				cell.t = 'n'; cell.z = XLSX.SSF._table[14];
  				cell.v = datenum(cell.v);
  			}
  			else cell.t = 's';

  			ws[cell_ref] = cell;
  		}
  	}
  	if(range.s.c < 10000000) ws['!ref'] = XLSX.utils.encode_range(range);
  	return ws;
  }

  function _generateTable() {
    var results = [];
    var row = [];
    var headers = [];
    for (var i = 0;i < $scope.taxonsList.length;i++) {
      row = [];
      for (var key in $scope.taxonsList[i]) {
        if(key != '$$hashKey'){
          if (i == 0) {
            headers.push(key);
          }
          row.push($scope.taxonsList[i][key]);
        }
      }
      results.push(row);
    }
    results.splice(0,0, headers);
    return results;
  }

  function Workbook() {
    if (!(this instanceof Workbook)) return new WorkBook();
    this.SheetNames = [];
    this.Sheets = {};
  }

  function txtTerms_search(sender){
    var terms = $scope.txtTerms.split('\n');
    var req = { };
    if(terms.length > 0) {
      // query each 1000 queries
      if (terms.length > 1000){
        // paging style is needed alert that to the user
        alert('It is only possible to get 1000 on this input');
      } else {
        // query the terms
        req = { names: terms.join('|') };
        tRexAPIService.searchTaxons(req).success(function(res) {
          if (res != null && res.data != null && res.data.length > 0) {
            $scope.taxonsList = [];
            res.data.forEach(function(v, k) {
              if(v.is_known_name) {
                var taxonClassifications = _getTaxonClassification(
                    v.results[0].classification_path.split('|')
                  , v.results[0].classification_path_ranks.split('|'));

                var taxonRanks = [
                    taxonClassifications.kingdom != null ? 'kingdom' : null
                  , taxonClassifications.phylum != null ? 'phylum' : null
                  , taxonClassifications.class != null ? 'class' : null
                  , taxonClassifications.order != null ? 'order' : null
                  , taxonClassifications.family != null ? 'family' : null
                  , taxonClassifications.genus != null ? 'genus' : null
                  , taxonClassifications.species != null ? 'species' : null
                  , taxonClassifications.subspecies != null ? 'subspecies': null,
                  , taxonClassifications.specificEpithet != null ? 'specificEpithet' : null
                  , taxonClassifications.infraSpecificEpithet != null ? 'infraspecificEpithet' : null
                ];

                var taxonRank = _getString(_getTaxonRank(taxonRanks));

                $scope.taxonsList.push({
                    supplied_name_string: v.supplied_name_string
                  , kingdom: taxonClassifications.kingdom
                  , phylum: taxonClassifications.phylum
                  , class: taxonClassifications.class
                  , order: taxonClassifications.order
                  , family: taxonClassifications.family
                  , genus: taxonClassifications.genus
                  , species: taxonClassifications.species
                  , subspecies: taxonClassifications.subspecies
                  , specificEpithet: taxonClassifications.specificEpithet
                  , infraSpecificEpithet: taxonClassifications.infraSpecificEpithet
                  , taxonRank: taxonRank
                  , author: null
                  , scientificName: v.results[0].canonical_form
                  , data_source_title: v.results[0].data_source_title
                  , match: _getString(v.is_known_name)
                });
              } else {
                $scope.taxonsList.push({
                    supplied_name_string: v.supplied_name_string
                  , kingdom: null
                  , phylum: null
                  , class: null
                  , order: null
                  , family: null
                  , genus: null
                  , species: null
                  , subspecies: null
                  , specificEpithet: null
                  , infraSpecificEpithet: null
                  , taxonRank: null
                  , author: null
                  , scientificName: null
                  , data_source_title: null
                  , match: _getString(v.is_known_name)
                });
              }
            });
          }
        }).error(function(res){
          console.log('ERROR on txtTerms_search');
        });
       }
     }
  }

  function _getTaxonClassification(path, rank){
    //looking for ['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species', 'subspecies'];
    return {
      kingdom: path[rank.indexOf('kingdom')],
      phylum: path[rank.indexOf('phylum')],
      class: path[rank.indexOf('class')],
      order: path[rank.indexOf('order')],
      family: path[rank.indexOf('family')],
      genus: path[rank.indexOf('genus')],
      species: path[rank.indexOf('species')],
      subspecies: path[rank.indexOf('subspecies')],
      specificEpithet: null,
      infraSpecificEpithet: null
    };
  }

  function _getTaxonRank(taxonRanks) {
    var taxonRanks = taxonRanks.reverse();
    var taxonRank = null;
    for (var i = 0; i < taxonRanks.length; i++) {
      if (taxonRanks[i] != null) {
        taxonRank = taxonRanks[i];
        break;
      }
    }
    return taxonRank;
  }

  function _getString(key) {
    var esTable = {
      "kingdom": "reino",
      "phylum": "filo",
      "class": "clase",
      "order": "orden",
      "family": "familia",
      "genus": "genero",
      "species": "especie",
      "subspecies": "subespecie",
      "specificEpithet": "epíteto específico",
      "infraspecificEpithet": "epíteto infraespecífico",
      "true": "si",
      "false": "no"
    };
    var enTable = {
      "kingdom": "kingdom",
      "phylum": "phylum",
      "class": "class",
      "order": "order",
      "family": "family",
      "genus": "genus",
      "species": "species",
      "subspecies": "subspecies",
      "specificEpithet": "specific epithet",
      "infraspecificEpithet": "infraspecific epithet",
      "true": "true",
      "false": "false"
    };
    var result = key;
    var isEs = $scope.lang.indexOf("es") > -1;
    if (isEs){
      result = esTable[key];
    } else {
      result = enTable[key];
    }
    return result;
  }
});